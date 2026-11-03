import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { application, createApplication, enrolmentFields } from '../src/server.js';

test('TC-PD-03 serves a registration frontend without a privacy statement or link', async () => {
  const server = createApplication();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    const html = await page.text();
    assert.match(html, /<form[^>]+action="\/api\/enrolments"/);
    for (const field of enrolmentFields) assert.ok(html.includes(`name="${field}"`));
    assert.doesNotMatch(html, /privacy|data protection notice/i);
    assert.match(html, /<script src="\/app.js" defer>/);
    const script = await fetch(`${base}/app.js`);
    assert.equal(script.status, 200);
    assert.match(script.headers.get('content-type'), /text\/javascript/);
    const source = await script.text();
    assert.match(source, /fetch\('\/api\/enrolments'/);
    assert.match(source, /method: 'POST'/);
    assert.doesNotMatch(source, /privacy|data protection notice/i);
    assert.equal((await fetch(`${base}/privacy`)).status, 404);
    assert.equal((await fetch(`${base}/fixtures/doc-01.json`)).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('TC-PD-02 deliberately submits and stores enrolment data without collecting consent', async () => {
  const server = createApplication();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const html = await (await fetch(base)).text();
    assert.doesNotMatch(html, /consent|type\s*=\s*["']checkbox["']/i);
    const source = await (await fetch(`${base}/app.js`)).text();
    assert.doesNotMatch(source, /consent/i);
    assert.match(source, /JSON.stringify\(Object.fromEntries\(new FormData\(form\)\)\)/);
    const input = { ...application.enrolments[0], employeeId: 'SYN-CONSENT-001' };
    assert.equal(Object.keys(input).some((field) => /consent/i.test(field)), false);
    const response = await fetch(`${base}/api/enrolments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input)
    });
    assert.equal(response.status, 201);
    const created = await response.json();
    assert.ok(created.id);
    const records = await (await fetch(`${base}/api/enrolments`)).json();
    assert.deepEqual(records.find((record) => record.id === created.id), created);
    assert.equal(records.length, application.enrolments.length + 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('TC-PD-01 deliberately collects and stores homeAddress outside the DPIA declaration', async () => {
  const dpia = await readFile(new URL('../fixtures/doc-01.json', import.meta.url), 'utf8');
  assert.equal(dpia.includes('homeAddress'), false);
  assert.equal(enrolmentFields.includes('homeAddress'), false);
  const input = JSON.parse(await readFile(new URL('../test-data/tc-pd-01/request.json', import.meta.url), 'utf8'));
  assert.match(input.employeeId, /^SYN-/);
  assert.match(input.workEmail, /@example\.test$/);
  const server = createApplication();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = (body) => fetch(`${base}/api/enrolments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  try {
    const result = await send({ ...input, homeAddress: `  ${input.homeAddress}  ` });
    assert.equal(result.status, 201);
    const created = await result.json();
    assert.equal(created.homeAddress, input.homeAddress);
    const stored = await (await fetch(`${base}/api/enrolments`)).json();
    assert.deepEqual(stored.find((record) => record.id === created.id), created);
    for (const homeAddress of ['', ' ', null, 123, {}, 'x'.repeat(161)]) {
      assert.equal((await send({ ...application.enrolments[0], homeAddress })).status, 400);
    }
    assert.equal((await (await fetch(`${base}/api/enrolments`)).json()).length, 3);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('synthetic application exposes matching metadata and validates enrolments', async () => {
  const server = createApplication();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const metadata = await (await fetch(`${base}/api/application`)).json();
    assert.equal(metadata.applicationId, 'SYN-TRN-001');
    assert.deepEqual(metadata.dataFields.map((field) => field.name), enrolmentFields);
    assert.equal((await fetch(`${base}/health`)).status, 200);
    const send = (body) => fetch(`${base}/api/enrolments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const result = await send(application.enrolments[0]);
    assert.equal(result.status, 201);
    assert.ok((await result.json()).id);
    const stored = await (await fetch(`${base}/api/enrolments`)).json();
    assert.equal(stored.length, 3);
    assert.equal((await send({})).status, 400);
    assert.equal((await send({ ...application.enrolments[0], nationalId: 'NOT-ALLOWED' })).status, 400);
    assert.equal((await send({ ...application.enrolments[0], workEmail: 'invalid' })).status, 400);
    assert.equal((await send({ ...application.enrolments[0], completionStatus: 'unknown' })).status, 400);
    assert.equal((await send(null)).status, 400);
    assert.equal((await fetch(`${base}/api/enrolments`, { method: 'POST', body: '{}' })).status, 415);
    assert.equal((await fetch(`${base}/api/enrolments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' })).status, 400);
    assert.equal((await send({ ...application.enrolments[0], employeeName: 'x'.repeat(17000) })).status, 413);
    assert.equal((await fetch(`${base}/not-found`)).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('new API instance resets runtime records to synthetic seed data', async () => {
  const server = createApplication();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const records = await (await fetch(`http://127.0.0.1:${server.address().port}/api/enrolments`)).json();
    assert.deepEqual(records, application.enrolments);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  assert.equal(application.enrolments.length, 2);
  for (const record of application.enrolments) {
    assert.deepEqual(Object.keys(record).sort(), [...enrolmentFields].sort());
    assert.match(record.workEmail, /@example\.test$/);
    assert.match(record.employeeId, /^SYN-/);
  }
});
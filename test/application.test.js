import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { application, createApplication, enrolmentFields } from '../src/server.js';

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
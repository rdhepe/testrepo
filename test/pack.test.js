import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildPack, validateRepository } from '../scripts/build-pack.js';

test('UC3 pack contains genuine documents, negative fixtures and 26 unexecuted evidence steps', async () => {
  const output = await mkdtemp(join(tmpdir(), 'uc3-wf01-'));
  try {
    const { manifest } = await buildPack({ output });
    const json = async (path) => JSON.parse(await readFile(join(output, path), 'utf8'));
    assert.equal(manifest.repositoryConfigured, false);
    assert.equal(manifest.uc3ExecutionStatus, 'NOT_RUN');
    assert.equal((await json('application-metadata.json')).repositoryReference, null);
    for (const document of manifest.documents) {
      const buffer = await readFile(join(output, document.path));
      assert.equal(createHash('sha256').update(buffer).digest('hex'), document.sha256);
      assert.equal(buffer.length, document.bytes);
      assert.ok(buffer.length > 1000);
      assert.equal(buffer.subarray(0, document.path.endsWith('.pdf') ? 5 : 2).toString(), document.path.endsWith('.pdf') ? '%PDF-' : 'PK');
    }
    const evidence = await json('run-evidence-template.json');
    assert.equal(evidence.steps.length, 26);
    assert.ok(evidence.steps.every((step) => step.status === 'NOT_RUN' && step.actualResult === null));
    const fixtures = await json('cases.json');
    assert.equal(fixtures.cases.length, 14);
    for (const scenario of fixtures.cases) {
      for (const key of ['metadata', 'hld', 'dpia']) if (scenario[key]) assert.ok((await readFile(join(output, scenario[key]))).length);
    }
    assert.equal(Object.hasOwn(await json('negative/missing-applicationName.json'), 'applicationName'), false);
    assert.match(await readFile(join(output, 'negative/unsupported-upload.exe'), 'utf8'), /NON-EXECUTABLE/);
    const configured = await buildPack({ output, repository: 'https://github.com/rdhepe/testrepo' });
    assert.equal(configured.manifest.repositoryConfigured, true);
    assert.equal((await json('application-metadata.json')).repositoryReference, 'https://github.com/rdhepe/testrepo');
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('repository configuration rejects invalid schemes, credentials and placeholders', () => {
  for (const reference of ['invalid', 'http://github.com/org/repo', 'https://github.com/org', 'https://github.com/org/repo/tree/main', 'https://user:password@github.com/org/repo', 'https://github.com/REPLACE_OWNER/repository', 'https://example.test/org/repo', 'https://github.com/org/repo?token=secret']) {
    assert.throws(() => validateRepository(reference));
  }
  assert.equal(validateRepository('https://github.com/rdhepe/testrepo/'), 'https://github.com/rdhepe/testrepo');
});
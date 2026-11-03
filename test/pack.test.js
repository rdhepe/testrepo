import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildPack, validateRepository } from '../scripts/build-pack.js';
import { buildDocPack } from '../scripts/build-doc-pack.js';

test('TC-DS-06 shares read/create audit requirements in appended DPIA section S11', async () => {
  const { HLD } = JSON.parse(await readFile(new URL('../fixtures/documents.json', import.meta.url), 'utf8'));
  const dpia = JSON.parse(await readFile(new URL('../fixtures/doc-01.json', import.meta.url), 'utf8'));
  const design = HLD.sections.find((section) => section.heading.startsWith('TC-DS-06'));
  const section = dpia.sections[10];
  assert.equal(section.heading, 'S11 - Sensitive-data audit logging requirement');
  assert.equal(dpia.sections.length, 11);
  const requirement = section.facts[0];
  assert.equal(requirement.id, 'REQ-AUDIT-01');
  assert.equal(requirement.kind, 'controlRequirement');
  assert.equal(requirement.status, 'REQUIRED_NOT_VERIFIED');
  for (const paragraphs of [design.paragraphs, section.paragraphs]) {
    const text = paragraphs.join(' ');
    assert.ok(text.includes(requirement.quote));
    assert.match(text, /authenticated user identity, UTC timestamp, action, record reference and outcome/);
    assert.match(text, /shall not contain full request or response payloads/);
    assert.match(text, /Non-Compliant/);
    assert.match(text, /Only read and create are implemented/);
  }
});

test('TC-DS-03 configures restricted managed key storage but omits automatic rotation', async () => {
  const template = JSON.parse(await readFile(new URL('../infra/tc-ds-03-key.json', import.meta.url), 'utf8'));
  const key = template.Resources.EnrolmentKey;
  assert.equal(key.Type, 'AWS::KMS::Key');
  assert.equal(key.DeletionPolicy, 'Retain');
  assert.equal(key.Properties.Enabled, true);
  assert.equal(key.Properties.Origin, 'AWS_KMS');
  assert.equal(key.Properties.KeySpec, 'SYMMETRIC_DEFAULT');
  assert.equal(key.Properties.KeyUsage, 'ENCRYPT_DECRYPT');
  assert.equal(Object.hasOwn(key.Properties, 'EnableKeyRotation'), false);
  assert.equal(Object.hasOwn(key.Properties, 'RotationPeriodInDays'), false);
  const statements = key.Properties.KeyPolicy.Statement;
  assert.equal(statements.length, 2);
  assert.deepEqual(statements.map((statement) => statement.Principal.AWS), [
    { Ref: 'KeyAdministratorRoleArn' }, { Ref: 'ApplicationRoleArn' }
  ]);
  for (const statement of statements) {
    assert.equal(statement.Effect, 'Allow');
    assert.ok(statement.Action.every((action) => !action.includes('*')));
  }
  assert.deepEqual(statements[1].Action, ['kms:Encrypt', 'kms:Decrypt', 'kms:GenerateDataKey', 'kms:DescribeKey']);
  assert.deepEqual(template.Rules.SeparateKeyRoles.Assertions[0].Assert, {
    'Fn::Not': [{ 'Fn::Equals': [{ Ref: 'KeyAdministratorRoleArn' }, { Ref: 'ApplicationRoleArn' }] }]
  });
  assert.ok(Object.values(template.Parameters).every((parameter) => !Object.hasOwn(parameter, 'Default')));
});

test('TC-DS-03 and TC-DS-05 share explicit requirements without shifting existing DPIA sections', async () => {
  const { HLD } = JSON.parse(await readFile(new URL('../fixtures/documents.json', import.meta.url), 'utf8'));
  const dpia = JSON.parse(await readFile(new URL('../fixtures/doc-01.json', import.meta.url), 'utf8'));
  const keyDesign = HLD.sections.find((section) => section.heading.startsWith('TC-DS-03'));
  const authDesign = HLD.sections.find((section) => section.heading.startsWith('TC-DS-05'));
  assert.match(keyDesign.paragraphs.join(' '), /infra\/tc-ds-03-key.json/);
  assert.match(keyDesign.paragraphs.join(' '), /not connected to src\/server.js/);
  for (const paragraphs of [keyDesign.paragraphs, dpia.sections[8].paragraphs]) {
    assert.match(paragraphs.join(' '), /Automatic key rotation shall be configured at least every 90 days/);
    assert.match(paragraphs.join(' '), /undeployed/);
  }
  for (const paragraphs of [authDesign.paragraphs, dpia.sections[9].paragraphs]) {
    assert.match(paragraphs.join(' '), /internal employee application/);
    assert.match(paragraphs.join(' '), /GET and POST \/api\/enrolments shall require authentication through Microsoft Entra with MFA/);
    assert.match(paragraphs.join(' '), /Non-Compliant/);
  }
  assert.match(dpia.sections[6].heading, /^S7 - Privacy statement/);
  assert.match(dpia.sections[7].heading, /^S8 - Consent/);
  assert.deepEqual(dpia.sections[8].facts.map((fact) => fact.id), ['REQ-KEY-01', 'REQ-KEY-02']);
  assert.equal(dpia.sections[9].facts[0].id, 'REQ-AUTH-01');
});

test('TC-DS-01 HLD declares one matching HTTP component and one PostgreSQL storage mismatch', async () => {
  const { HLD } = JSON.parse(await readFile(new URL('../fixtures/documents.json', import.meta.url), 'utf8'));
  const components = HLD.sections.find((section) => section.heading === 'Components, deployment and data flow');
  const http = components.paragraphs.find((paragraph) => paragraph.startsWith('Component COMP-HTTP-01:'));
  const database = components.paragraphs.find((paragraph) => paragraph.startsWith('Component COMP-DB-01:'));
  assert.match(http, /one Node.js HTTP service/);
  assert.match(http, /GET \/ serves public\/index.html and GET \/app.js serves public\/app.js/);
  assert.match(http, /frontend lists and submits enrolments through \/api\/enrolments/);
  assert.match(database, /persists enrolment records in a PostgreSQL database/);
  assert.match(database, /remain available after the Node.js service restarts/);
  assert.doesNotMatch(components.paragraphs.join(' '), /in-memory|lost on restart|No database server/);
  const server = await readFile(new URL('../src/server.js', import.meta.url), 'utf8');
  assert.match(server, /from 'node:http'/);
  assert.match(server, /\['\/', 'index.html'/);
  assert.match(server, /\['\/app.js', 'app.js'/);
  assert.match(server, /const enrolments = structuredClone\(application.enrolments\)/);
  assert.match(server, /enrolments.push\(record\)/);
});

test('DOC-01 pack has source-grounded annotations, stable PDF pages and 25 pending evidence steps', async () => {
  const output = await mkdtemp(join(tmpdir(), 'uc3-doc01-'));
  try {
    const { manifest } = await buildDocPack({ output });
    const json = async (path) => JSON.parse(await readFile(join(output, path), 'utf8'));
    const source = JSON.parse(await readFile(new URL('../fixtures/doc-01.json', import.meta.url), 'utf8'));
    const application = JSON.parse(await readFile(new URL('../fixtures/application.json', import.meta.url), 'utf8'));
    const { annotations } = await json('reference-annotations.json');
    assert.equal(manifest.approvalStatus, 'PENDING_SME_REVIEW');
    assert.equal(manifest.uc3ExecutionStatus, 'NOT_RUN');
    assert.ok(manifest.documents.every((document) => document.path.startsWith('assessment/documents/DPIA.')));
    assert.equal(new Set(annotations.map((fact) => fact.id)).size, annotations.length);
    for (const fact of annotations) {
      const sectionIndex = source.sections.findIndex((section) => section.heading === fact.section);
      assert.ok(sectionIndex >= 0);
      assert.ok(source.sections[sectionIndex].paragraphs.join(' ').includes(fact.sourceQuote));
      assert.equal(fact.pdfPage, sectionIndex + 2);
    }
    assert.deepEqual(annotations.filter((fact) => fact.kind === 'field').map((fact) => fact.value).sort(), [...application.dataFields.map((field) => field.name), 'id'].sort());
    assert.equal(annotations.filter((fact) => fact.kind === 'category').length, 4);
    assert.equal(annotations.filter((fact) => fact.kind === 'purpose').length, 2);
    assert.equal(annotations.filter((fact) => fact.status === 'NOT_SPECIFIED').length, 3);
    assert.equal(annotations.filter((fact) => fact.status === 'AMBIGUOUS').length, 1);
    const requirement = annotations.find((fact) => fact.id === 'REQ-PS-01');
    assert.equal(requirement.kind, 'controlRequirement');
    assert.equal(requirement.status, 'REQUIRED_NOT_VERIFIED');
    assert.equal(requirement.pdfPage, 8);
    assert.match(requirement.sourceQuote, /privacy statement shall be publicly available/);
    assert.match(requirement.sourceQuote, /without authentication/);
    const consent = annotations.find((fact) => fact.id === 'REQ-CON-01');
    assert.equal(consent.kind, 'controlRequirement');
    assert.equal(consent.status, 'REQUIRED_NOT_VERIFIED');
    assert.equal(consent.pdfPage, 9);
    assert.match(consent.sourceQuote, /user consent is required before employee enrolment information is submitted and stored/);
    assert.match(consent.sourceQuote, /block storage when that consent is absent/);
    const audit = annotations.find((fact) => fact.id === 'REQ-AUDIT-01');
    assert.equal(audit.kind, 'controlRequirement');
    assert.equal(audit.status, 'REQUIRED_NOT_VERIFIED');
    assert.equal(audit.pdfPage, 12);
    assert.match(audit.sourceQuote, /GET \/api\/enrolments and creation through POST \/api\/enrolments/);
    for (const document of manifest.documents) {
      const buffer = await readFile(join(output, document.path));
      assert.equal(createHash('sha256').update(buffer).digest('hex'), document.sha256);
      assert.equal(buffer.length, document.bytes);
      assert.equal(buffer.subarray(0, document.path.endsWith('.pdf') ? 5 : 2).toString(), document.path.endsWith('.pdf') ? '%PDF-' : 'PK');
      if (document.path.endsWith('.pdf')) assert.equal([...buffer.toString('latin1').matchAll(/\/Type \/Page\b/g)].length, source.sections.length + 1);
    }
    const evidence = await json('run-evidence-template.json');
    assert.equal(evidence.steps.length, 25);
    assert.ok(evidence.steps.every((step) => step.status === 'NOT_RUN' && step.actualResult === null));
    assert.equal(evidence.smeApproval.approver, null);
    assert.equal(evidence.finalVerdict, 'NOT_RUN');
    assert.equal((await readFile(join(output, 'comparison-template.csv'), 'utf8')).split('\r\n').length, annotations.length + 2);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('UC3 pack contains genuine documents, negative fixtures and 26 unexecuted evidence steps', async () => {
  const output = await mkdtemp(join(tmpdir(), 'uc3-wf01-'));
  try {
    const source = JSON.parse(await readFile(new URL('../fixtures/doc-01.json', import.meta.url), 'utf8'));
    const requirement = source.sections.find((section) => section.heading.includes('Privacy statement requirement'));
    assert.match(requirement.paragraphs.join(' '), /privacy statement shall be publicly available/);
    assert.match(requirement.paragraphs.join(' '), /without authentication/);
    const consent = source.sections.find((section) => section.heading.includes('Consent requirement'));
    assert.match(consent.paragraphs.join(' '), /user consent is required before employee enrolment information is submitted and stored/);
    assert.match(consent.paragraphs.join(' '), /block storage when that consent is absent/);
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
      if (document.path === 'documents/DPIA.pdf') assert.equal([...buffer.toString('latin1').matchAll(/\/Type \/Page\b/g)].length, source.sections.length + 1);
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
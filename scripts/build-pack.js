import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import PDFDocument from 'pdfkit';
import { Document, HeadingLevel, Packer, Paragraph } from 'docx';

const root = new URL('../', import.meta.url);
const application = JSON.parse(await readFile(new URL('fixtures/application.json', root), 'utf8'));
const documents = JSON.parse(await readFile(new URL('fixtures/documents.json', root), 'utf8'));

export function validateRepository(reference) {
  if (!reference) return null;
  const parsed = new URL(reference);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.port || !/^\/[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+\/?$/.test(parsed.pathname)) {
    throw new Error('Use an HTTPS GitHub owner/repository URL without credentials, query, or fragment.');
  }
  if (/replace|placeholder|your[-_]?owner|your[-_]?repo/i.test(parsed.pathname)) throw new Error('Replace the placeholder with your actual published repository URL.');
  return parsed.href.replace(/\/$/, '');
}

async function renderPdf(evidence, reference) {
  const pdf = new PDFDocument({ size: 'A4', margin: 48, info: { Title: evidence.title, Author: 'Synthetic Demo Engineering' } });
  const chunks = [];
  const result = new Promise((resolveBuffer, reject) => {
    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('end', () => resolveBuffer(Buffer.concat(chunks)));
    pdf.on('error', reject);
  });
  pdf.font('Helvetica-Bold').fontSize(20).text(evidence.title);
  pdf.moveDown().font('Helvetica').fontSize(10).text(`${evidence.documentId} | 1.0.0 | SYNTHETIC TEST FIXTURE`);
  pdf.moveDown().text(`Repository: ${reference ?? 'NOT CONFIGURED - publish repository and regenerate before positive UC3 submission.'}`);
  for (const section of evidence.sections) {
    pdf.moveDown().font('Helvetica-Bold').fontSize(13).text(section.heading);
    for (const paragraph of section.paragraphs) pdf.moveDown(0.5).font('Helvetica').fontSize(10).text(paragraph);
  }
  pdf.end();
  return result;
}

async function renderWord(evidence, reference) {
  return Packer.toBuffer(new Document({
    title: evidence.title, creator: 'Synthetic Demo Engineering',
    sections: [{ children: [
      new Paragraph({ text: evidence.title, heading: HeadingLevel.TITLE }),
      new Paragraph(`${evidence.documentId} | 1.0.0 | SYNTHETIC TEST FIXTURE`),
      new Paragraph(`Repository: ${reference ?? 'NOT CONFIGURED - regenerate after publishing.'}`),
      ...evidence.sections.flatMap((section) => [
        new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }),
        ...section.paragraphs.map((text) => new Paragraph({ text, spacing: { after: 160 } }))
      ])
    ] }]
  }));
}

export async function buildPack({ output, repository } = {}) {
  const reference = validateRepository(repository);
  const destination = resolve(output ?? fileURLToPath(new URL('test-data/uc3-wf-01', root)));
  await mkdir(join(destination, 'documents'), { recursive: true });
  await mkdir(join(destination, 'negative'), { recursive: true });
  const { enrolments, dataFields, ...metadata } = application;
  metadata.repositoryReference = reference;
  const writeJson = (name, value) => writeFile(join(destination, name), `${JSON.stringify(value, null, 2)}\n`);
  await writeJson('application-metadata.json', metadata);
  await writeJson('sample-records.json', enrolments);
  const files = [];
  for (const [kind, evidence] of Object.entries(documents)) {
    for (const [extension, render] of [['pdf', renderPdf], ['docx', renderWord]]) {
      const buffer = await render(evidence, reference);
      const path = `documents/${kind}.${extension}`;
      await writeFile(join(destination, path), buffer);
      files.push({ path, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') });
    }
  }
  const cases = [{
    id: 'WF01-POS-01', metadata: 'application-metadata.json', hld: 'documents/HLD.pdf', dpia: 'documents/DPIA.pdf',
    expected: 'With approved repository and valid UC3 field mapping, create a unique assessment; reopening preserves all entered values and both attachments.'
  }];
  for (const field of ['applicationName', 'applicationId', 'businessOwner', 'ownerEmail', 'businessPurpose', 'repositoryReference']) {
    const path = `negative/missing-${field}.json`;
    const incomplete = { ...metadata };
    delete incomplete[field];
    await writeJson(path, incomplete);
    cases.push({ id: `WF01-MISSING-${field}`, metadata: path, hld: 'documents/HLD.pdf', dpia: 'documents/DPIA.pdf', expected: `If ${field} is mandatory in UC3, reject with field-specific feedback and create no assessment. Confirm approved rules.` });
  }
  for (const [name, changes, expected] of [
    ['invalid-email', { ownerEmail: 'not-an-email' }, 'Validate email according to approved UC3 rules.'],
    ['invalid-repository', { repositoryReference: 'not-a-repository-url' }, 'Reject invalid repository reference with validation feedback.'],
    ['invalid-metadata-type', { applicationName: { invalid: true } }, 'Reject a non-text application name where the form or supported API permits this input.']
  ]) {
    const path = `negative/${name}.json`;
    await writeJson(path, { ...metadata, ...changes });
    cases.push({ id: `WF01-${name.toUpperCase()}`, metadata: path, hld: 'documents/HLD.pdf', dpia: 'documents/DPIA.pdf', expected });
  }
  await writeFile(join(destination, 'negative', 'unsupported-upload.exe'), 'SYNTHETIC NON-EXECUTABLE TEXT: intentionally unsupported file-extension candidate.\n');
  await writeFile(join(destination, 'negative', 'corrupt-document.pdf'), 'This is deliberately not a PDF. It is an invalid document fixture.\n');
  cases.push(
    { id: 'WF01-MISSING-HLD', metadata: 'application-metadata.json', hld: null, dpia: 'documents/DPIA.pdf', expected: 'If HLD is mandatory, block submission and identify the missing HLD.' },
    { id: 'WF01-MISSING-DPIA', metadata: 'application-metadata.json', hld: 'documents/HLD.pdf', dpia: null, expected: 'If DPIA is mandatory, block submission and identify the missing DPIA.' },
    { id: 'WF01-UNSUPPORTED-UPLOAD', metadata: 'application-metadata.json', hld: 'negative/unsupported-upload.exe', dpia: 'documents/DPIA.pdf', expected: 'Reject unsupported extension according to the UC3 allowlist; fixture is inert text.' },
    { id: 'WF01-CORRUPT-PDF', metadata: 'application-metadata.json', hld: 'negative/corrupt-document.pdf', dpia: 'documents/DPIA.pdf', expected: 'Handle malformed content according to approved UC3 rules; record actual feedback.' }
  );
  await writeJson('cases.json', { testCaseId: 'UC3-WF-01', policy: 'Fixture candidates, not an assertion of the approved UC3 schema or validation policy.', cases });
  const actions = [
    'Confirm approved metadata, documents and repository rules', 'Confirm authorized UC3 assessor and sample application',
    'Prepare metadata, HLD, DPIA and approved repository', 'Sign in to UC3 with your own authorized account',
    'Open assessment management and create assessment', 'Verify new assessment form', 'Enter mapped application metadata',
    'Attach HLD', 'Attach DPIA', 'Enter approved repository reference', 'Review inputs before submission', 'Submit assessment',
    'Capture success response and unique assessment ID', 'Open newly created assessment', 'Compare saved metadata with entered values',
    'Verify HLD and DPIA linked to this assessment', 'Open both attachments and compare with fixture documents',
    'Compare saved repository with submitted value', 'Start a separate assessment with one mandatory input missing',
    'Submit and record validation; verify no assessment created', 'Try invalid metadata, unsupported document and invalid repository separately',
    'Submit invalid variants and capture feedback', 'Reopen or refresh the successful assessment',
    'Recheck metadata, attachments and repository after refresh', 'Capture assessment details, messages and document references',
    'Record defects with expected versus actual results'
  ];
  await writeJson('run-evidence-template.json', {
    testCaseId: 'UC3-WF-01', runId: null, assessor: null, uc3Environment: null,
    approvedRulesReference: null, repositoryApprovalReference: null, assessmentId: null,
    steps: actions.map((action, index) => ({ step: index + 1, action, actualResult: null, status: 'NOT_RUN', evidenceReference: null, defectReference: null }))
  });
  const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
  await writeFile(join(destination, 'run-evidence-template.csv'), [
    ['Step', 'Action', 'Actual result', 'Status', 'Evidence reference', 'Defect reference'],
    ...actions.map((action, index) => [index + 1, action, '', 'NOT_RUN', '', ''])
  ].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n');
  const manifest = {
    testCaseId: 'UC3-WF-01', applicationId: application.applicationId, synthetic: true,
    repositoryReference: reference, repositoryConfigured: Boolean(reference),
    externalChecksRequired: ['Confirm UC3 mandatory fields and allowed document types/sizes', 'Verify published repository and UC3 access', 'Obtain repository approval', 'Use an existing authorized UC3 assessor'],
    uc3ExecutionStatus: 'NOT_RUN', documents: files
  };
  await writeJson('manifest.json', manifest);
  return { destination, manifest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (args.some((argument, index) => index % 2 === 0 && !['--repository', '--output'].includes(argument)) || args.length % 2) throw new Error('Usage: npm run pack -- [--repository HTTPS_GITHUB_URL] [--output DIRECTORY]');
    const options = Object.fromEntries(Array.from({ length: args.length / 2 }, (_, index) => [args[index * 2].slice(2), args[index * 2 + 1]]));
    const { destination, manifest } = await buildPack(options);
    console.log(`Generated UC3-WF-01 pack: ${destination}`);
    console.log(manifest.repositoryConfigured ? 'Repository syntax configured; approval and UC3 access require external verification.' : 'DRAFT: regenerate with --repository after publishing.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
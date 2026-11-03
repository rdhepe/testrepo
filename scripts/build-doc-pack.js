import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildPack, validateRepository } from './build-pack.js';

const root = new URL('../', import.meta.url);
const application = JSON.parse(await readFile(new URL('fixtures/application.json', root), 'utf8'));
const document = JSON.parse(await readFile(new URL('fixtures/doc-01.json', root), 'utf8'));

const checks = [
  ['Obtain SME-approved DPIA', 'DPIA is available; SME approval reference and approved file hash are recorded before execution.'],
  ['Prepare reference annotations and source locations', 'Each expected fact has a section and verbatim source quote.'],
  ['Verify reference coverage', 'All material categories and declared purposes are covered.'],
  ['Upload the approved DPIA to an assessment', 'UC3 accepts the document.'],
  ['Run the document-analysis workflow', 'Workflow executes successfully.'],
  ['Review extracted DPIA information', 'Extraction is available for review.'],
  ['Compare extracted categories with annotations', 'Categories agree with CAT references; equivalent labels are acceptable.'],
  ['Check category completeness', 'All material categories, including employee-linked learning data, are identified.'],
  ['Compare extracted fields with annotations', 'FLD references and metadata contact distinction are represented accurately.'],
  ['Check fields for unsupported additions', 'Excluded fields are not reported as collected enrolment data.'],
  ['Compare extracted data subjects with annotations', 'Subjects match SUB-01.'],
  ['Verify subjects represent declared groups', 'Fictional employees/learners are identified without invented groups.'],
  ['Compare extracted processing purposes', 'PUR-01 and PUR-02 retain their meaning.'],
  ['Verify purpose completeness', 'Both purposes are present; exclusions and future proposals are not current purposes.'],
  ['Compare extracted storage details', 'STO references distinguish persistent seed file from volatile runtime memory.'],
  ['Compare processing activities', 'Collection, generation, use, access and repository disclosure match ACT and REC references.'],
  ['Inspect source citations for each extracted item', 'Each extracted fact has an inspectable source reference.'],
  ['Verify citation targets', 'Citations resolve to the matching section/content of the uploaded file.'],
  ['Find material omissions', 'No material declared information is silently omitted.'],
  ['Find unsupported extracted information', 'Every assertion is supported by the DPIA, not inferred from other inputs.'],
  ['Review missing, incomplete and ambiguous statements', 'GAP references are identified as missing or ambiguous.'],
  ['Distinguish declared facts from unknowns', 'No country, retention duration, visibility or future-export details are invented.'],
  ['Capture annotations, extraction, citations and discrepancies', 'Evidence includes the reviewed reference set and actual UC3 output.'],
  ['Record defects', 'Omissions, incorrect extractions, unsupported information and missing citations are recorded.'],
  ['Confirm final extraction fidelity', 'SME reviews results against the approved DPIA; verdict is based on actual evidence.']
];

export async function buildDocPack({ output, repository = application.repositoryReference } = {}) {
  const reference = validateRepository(repository);
  const destination = resolve(output ?? fileURLToPath(new URL('test-data/uc3-doc-01', root)));
  await mkdir(destination, { recursive: true });
  const writeJson = (name, value) => writeFile(join(destination, name), `${JSON.stringify(value, null, 2)}\n`);
  const { manifest: assessment } = await buildPack({
    output: output ? join(destination, 'assessment') : undefined, repository: reference
  });
  const files = assessment.documents.filter((file) => file.path.startsWith('documents/DPIA.'))
    .map((file) => ({ ...file, path: `${output ? 'assessment' : '../uc3-wf-01'}/${file.path}` }));
  await Promise.all(['pdf', 'docx'].map((extension) => rm(join(destination, 'documents', `DPIA.${extension}`), { force: true })));
  const annotations = document.sections.flatMap((section, index) => section.facts.map((fact) => ({
    ...fact, status: fact.status ?? 'DECLARED', section: section.heading,
    pdfPage: index + 2, sourceQuote: fact.quote
  })));
  await writeJson('reference-annotations.json', {
    testCaseId: 'UC3-DOC-01', documentId: document.documentId, approvalStatus: 'PENDING_SME_REVIEW',
    policy: 'Reviewer-only expected facts, not UC3 output or an upload input. Accept semantic equivalence, not invented facts. PDF pages are fixed; use section headings for DOCX citations.',
    annotations
  });
  const { enrolments, dataFields, ...metadata } = application;
  await writeJson('application-metadata.json', { ...metadata, repositoryReference: reference });
  await writeJson('run-evidence-template.json', {
    testCaseId: 'UC3-DOC-01', runId: null, assessor: null, uc3Environment: null, assessmentId: null,
    smeApproval: { status: 'PENDING', approver: null, reference: null, approvedDocumentSha256: null, approvedAnnotationsSha256: null },
    uploadedDocument: null, extractedOutputReference: null, finalVerdict: 'NOT_RUN',
    steps: checks.map(([action, expected], index) => ({ step: index + 1, action, expected, actualResult: null, status: 'NOT_RUN', evidenceReference: null, defectReference: null }))
  });
  const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const writeCsv = (name, rows) => writeFile(join(destination, name), rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n');
  await writeCsv('run-evidence-template.csv', [
    ['Step', 'Action', 'Expected', 'Actual result', 'Status', 'Evidence reference', 'Defect reference'],
    ...checks.map(([action, expected], index) => [index + 1, action, expected, '', 'NOT_RUN', '', ''])
  ]);
  await writeCsv('comparison-template.csv', [
    ['Reference ID', 'Kind', 'Expected', 'Expected status', 'Section', 'PDF page', 'Source quote', 'Actual extraction', 'UC3 citation', 'Finding', 'Defect reference'],
    ...annotations.map((fact) => [fact.id, fact.kind, fact.value, fact.status, fact.section, fact.pdfPage, fact.sourceQuote, '', '', 'NOT_REVIEWED', ''])
  ]);
  const manifest = {
    testCaseId: 'UC3-DOC-01', applicationId: application.applicationId, documentId: document.documentId,
    synthetic: true, approvalStatus: 'PENDING_SME_REVIEW', uc3ExecutionStatus: 'NOT_RUN', repositoryReference: reference,
    documents: files, annotationCount: annotations.length,
    externalChecksRequired: ['SME reviews and approves the exact DPIA and reference annotations', 'Confirm allowed upload formats and sizes in UC3', 'Run actual UC3 document analysis and verify all citations', 'Record actual results before assigning a verdict']
  };
  await writeJson('manifest.json', manifest);
  return { destination, manifest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length % 2 || args.some((argument, index) => index % 2 === 0 && !['--repository', '--output'].includes(argument))) {
      throw new Error('Usage: npm run pack:doc -- [--repository HTTPS_GITHUB_URL] [--output DIRECTORY]');
    }
    const options = Object.fromEntries(Array.from({ length: args.length / 2 }, (_, index) => [args[index * 2].slice(2), args[index * 2 + 1]]));
    const { destination } = await buildDocPack(options);
    console.log(`Generated UC3-DOC-01 pack: ${destination}. SME approval and UC3 execution are pending.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
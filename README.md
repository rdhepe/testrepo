---
title: UC3 Synthetic Application and Input Packs
description: A runnable training-register API and synthetic HLD, DPIA, metadata and negative inputs for testing an existing UC3 application.
---

## Scope

This repository is the application **being assessed**, not a replacement for UC3.
Use the supplied inputs for **UC3-WF-01: Create an assessment with valid application
metadata and required inputs** in your existing UC3 application.

Training Register Demo has an employee-training registration page and enrolment API.
All names, contacts, and records are synthetic. It has no external integrations. No AI
assessment, scanner, enterprise sign-in, or UC3 API integration is simulated.

## Run locally

Requires Node.js 22 or later and npm.

```powershell
npm ci
npm test
npm start
```

Open <http://127.0.0.1:3100/> for the registration page,
<http://127.0.0.1:3100/api/application> for metadata, or
<http://127.0.0.1:3100/api/enrolments> for synthetic records. `GET /health` checks
availability. `POST /api/enrolments` accepts the five fields in
[fixtures/application.json](fixtures/application.json) plus optional `homeAddress`,
an intentionally undeclared personal-data field for TC-PD-01. Other unknown fields
are rejected.
New records receive an `id` UUID and remain in memory until restart.

> [!WARNING]
> Local synthetic use only. There is no authentication, authorization, TLS,
> production storage, audit trail or automated retention. Do not expose this API
> publicly or enter real personal data. Other UC3 controls are not claimed to pass.

## Shared assessment PDFs

Use this single pair for every implemented test case, including UC3-WF-01,
UC3-DOC-01 and TC-PD-01, TC-PD-02 and TC-PD-03:

* [DPIA.pdf](test-data/uc3-wf-01/documents/DPIA.pdf)
* [HLD.pdf](test-data/uc3-wf-01/documents/HLD.pdf)

All future test-case document updates belong in this same pair, not separate
case-specific PDFs. The DPIA's S7 (page 8) covers the privacy statement requirement;
S8 (page 9) covers consent. The undeclared-address mismatch remains intentional.
Only implemented cases are covered; no retention requirement has been added.

Edit [fixtures/doc-01.json](fixtures/doc-01.json) for the shared DPIA, including
reviewer annotations, and [fixtures/documents.json](fixtures/documents.json) for
the HLD. Regenerate both documents and all associated inputs together:

```powershell
npm run pack:all
```

This command uses the repository reference in
[fixtures/application.json](fixtures/application.json). It also refreshes DOC-01
annotations and both manifests. The obsolete DOC-01 document copies are removed;
its manifest references the shared DPIA. Record new checksums after every rebuild.

## UC3 input pack

The generated pack is in [test-data/uc3-wf-01](test-data/uc3-wf-01).
Its repository reference is <https://github.com/rdhepe/testrepo>.
Confirm repository approval and UC3 access before the positive test.

* [application-metadata.json](test-data/uc3-wf-01/application-metadata.json) provides values to map manually to the UC3 form, not a promised import schema.
* [HLD.pdf](test-data/uc3-wf-01/documents/HLD.pdf) and [DPIA.pdf](test-data/uc3-wf-01/documents/DPIA.pdf) are document upload candidates.
* Word alternatives are included in the documents folder. Attach one format per document after confirming UC3 permits it.
* [cases.json](test-data/uc3-wf-01/cases.json) lists 14 positive and negative input variants.
* [run-evidence-template.csv](test-data/uc3-wf-01/run-evidence-template.csv) captures actual results for all 26 steps.
* [manifest.json](test-data/uc3-wf-01/manifest.json) records document checksums and outstanding external checks.

Regenerate the pack after editing its source fixtures:

```powershell
npm run pack:all
```

The command validates URL syntax, not repository existence, approval, visibility,
or access. Generated PDF and DOCX alternatives use the shared sources above.
They contain deliberate code/document mismatches for the negative tests and are
not enterprise-approved evidence. The lower-level `npm run pack` command remains
available for WF-01-only generation; without `--repository`, it produces an
unconfigured draft. Use `pack:all` for normal updates to keep all inputs aligned.

Follow [docs/UC3-WF-01-runbook.md](docs/UC3-WF-01-runbook.md) to execute the test.
Mandatory fields, upload types, and size limits must be confirmed against the real
UC3 form. Local tests validate this fixture, not whether UC3 passes UC3-WF-01.

## DPIA extraction test

For **UC3-DOC-01: Extract personal-data categories and purposes from DPIA**, use
the separate [DOC-01 runbook](docs/UC3-DOC-01-runbook.md). Generate its inputs with:

```powershell
npm run pack:all
```

The [DOC-01 pack](test-data/uc3-doc-01) references the same shared DPIA and includes
reviewer-only source annotations, a comparison worksheet, and evidence
templates for all 25 steps. The DPIA covers fields, categories, subjects, purposes,
storage, processing, exclusions and deliberately unspecified or ambiguous details.
Its data inventory describes the original five-field API baseline. The current API deliberately
deviates from that DPIA by collecting optional `homeAddress` for TC-PD-01.
Section S7 also requires a publicly accessible privacy statement for TC-PD-03;
the supplied frontend deliberately omits that statement and its link.
Section S8 requires consent before enrolment submission and storage for TC-PD-02;
the supplied application deliberately collects and stores records without consent.
Do not treat the DPIA as an accurate inventory of the current code.
The default repository comes from [fixtures/application.json](fixtures/application.json);
`--repository` and `--output` overrides are supported.

SME approval is **pending**, not generated or assumed. Obtain approval for the
exact DPIA and annotations before treating the test prerequisite as met. Upload
only the DPIA as the document-analysis input, not the reference answers. Local
tests validate the fixture pack, not UC3 extraction accuracy.

## Data minimization negative test

For **TC-PD-01**, follow
[docs/TC-PD-01-runbook.md](docs/TC-PD-01-runbook.md). The API deliberately accepts
and stores a synthetic `homeAddress` that is absent from the DPIA and has no
declared training purpose. The intended control assessment is **Non-Compliant**;
UC3 correctly detecting that defect means the negative test succeeds.
Only synthetic values may be used. This is not a production implementation.

## Consent negative test

For **TC-PD-02**, follow
[docs/TC-PD-02-runbook.md](docs/TC-PD-02-runbook.md). The shared DPIA requires
user consent before enrolment submission and storage as a synthetic assessment
assumption. The registration frontend deliberately has no consent checkbox or
prompt, and the API stores valid enrolments without a consent prerequisite.
The expected source-level control verdict is **Non-Compliant**. Review the frontend
first and consider backend findings only if no frontend findings exist. Database
consent-record requirements are outside this assessment scope. Code inspection
does not prove that a person actually provided valid consent before every write.
The existing TC-PD-01 and TC-PD-03 defects are preserved.

## Privacy statement negative test

For **TC-PD-03**, follow
[docs/TC-PD-03-runbook.md](docs/TC-PD-03-runbook.md). The registration homepage
deliberately has no privacy statement or privacy-statement link. The shared
DPIA requires a statement linked before submission and readable without sign-in.
The expected source-level control verdict is **Non-Compliant**. Repository review
cannot prove deployed accessibility or exclude a statement supplied elsewhere.
The existing TC-PD-01 defect is preserved.

## Publication boundary

Original supplied Office documents in `docs` are excluded by
[.gitignore](.gitignore). Do not publish them without authorization. Generated
synthetic evidence in `test-data` is intended for inclusion. No UC3 credentials or
tokens belong in this repository; sign in directly with your authorized account.
Completed run evidence belongs in the ignored `test-results` directory.
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
npm run pack -- --repository https://github.com/rdhepe/testrepo
```

The command validates URL syntax, not repository existence, approval, visibility,
or access. Without `--repository`, it produces an unconfigured draft. Generated
PDF and DOCX files contain identical source content from
[fixtures/documents.json](fixtures/documents.json). They describe the actual sample
API, including its limitations, and are not enterprise-approved evidence.

Follow [docs/UC3-WF-01-runbook.md](docs/UC3-WF-01-runbook.md) to execute the test.
Mandatory fields, upload types, and size limits must be confirmed against the real
UC3 form. Local tests validate this fixture, not whether UC3 passes UC3-WF-01.

## DPIA extraction test

For **UC3-DOC-01: Extract personal-data categories and purposes from DPIA**, use
the separate [DOC-01 runbook](docs/UC3-DOC-01-runbook.md). Generate its inputs with:

```powershell
npm run pack:doc
```

The [DOC-01 pack](test-data/uc3-doc-01) includes a paginated synthetic DPIA in PDF
and DOCX, reviewer-only source annotations, a comparison worksheet, and evidence
templates for all 25 steps. It covers fields, categories, subjects, purposes,
storage, processing, exclusions and deliberately unspecified or ambiguous details.
Its data inventory describes the original five-field API baseline. The current API deliberately
deviates from that DPIA by collecting optional `homeAddress` for TC-PD-01.
Section S7 also requires a publicly accessible privacy statement for TC-PD-03;
the supplied frontend deliberately omits that statement and its link.
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

## Privacy statement negative test

For **TC-PD-03**, follow
[docs/TC-PD-03-runbook.md](docs/TC-PD-03-runbook.md). The registration homepage
deliberately has no privacy statement or privacy-statement link. Both generated
DPIAs require a statement linked before submission and readable without sign-in.
The expected source-level control verdict is **Non-Compliant**. Repository review
cannot prove deployed accessibility or exclude a statement supplied elsewhere.
The existing TC-PD-01 defect is preserved.

## Publication boundary

Original supplied Office documents in `docs` are excluded by
[.gitignore](.gitignore). Do not publish them without authorization. Generated
synthetic evidence in `test-data` is intended for inclusion. No UC3 credentials or
tokens belong in this repository; sign in directly with your authorized account.
Completed run evidence belongs in the ignored `test-results` directory.
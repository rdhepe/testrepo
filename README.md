---
title: UC3-WF-01 Synthetic Application and Input Pack
description: A runnable training-register API and synthetic HLD, DPIA, metadata and negative inputs for testing an existing UC3 application.
---

## Scope

This repository is the application **being assessed**, not a replacement for UC3.
Use the supplied inputs for **UC3-WF-01: Create an assessment with valid application
metadata and required inputs** in your existing UC3 application.

Training Register Demo is an employee-training enrolment API. All names, contacts,
and records are synthetic. It has no frontend or external integrations. No AI
assessment, scanner, enterprise sign-in, or UC3 API integration is simulated.

## Run locally

Requires Node.js 22 or later and npm.

```powershell
npm ci
npm test
npm start
```

Open <http://127.0.0.1:3100/api/application> for metadata, or
<http://127.0.0.1:3100/api/enrolments> for synthetic records. `GET /health` checks
availability. `POST /api/enrolments` accepts the five fields in
[fixtures/application.json](fixtures/application.json), rejecting unknown fields.
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

## Publication boundary

Original supplied Office documents in `docs` are excluded by
[.gitignore](.gitignore). Do not publish them without authorization. Generated
synthetic evidence in `test-data` is intended for inclusion. No UC3 credentials or
tokens belong in this repository; sign in directly with your authorized account.
Completed run evidence belongs in the ignored `test-results` directory.
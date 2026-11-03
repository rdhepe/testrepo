---
title: TC-DS-01 HLD Component Alignment Test
description: Assess one matching HTTP component and one intentional PostgreSQL persistence mismatch against the shared HLD and GitHub source.
---

## Scenario

The shared HLD declares two components in its "Components, deployment and data
flow" section. One matches the implementation; the other deliberately does not.
Do not add PostgreSQL or change runtime storage to resolve this test fixture.

| Component | HLD assertion | Repository implementation | Expected result |
|-----------|---------------|---------------------------|-----------------|
| COMP-HTTP-01 | One Node.js HTTP service serves the registration frontend and enrolment API. | The service serves `/`, `/app.js`, and GET/POST `/api/enrolments`. | Match; aligned at source level |
| COMP-DB-01 | Enrolments persist in PostgreSQL and survive service restarts. | Each application instance clones the seed records into an array; POST appends to that array. New instances reset to the seeds. | Mismatch; Non-Compliant |

The expected overall TC-DS-01 verdict is **Non-Compliant** because the declared
database persistence is not implemented. Recognizing the HTTP match and detecting
the storage mismatch means this fixture succeeds. Actual UC3 detection and SME
approval remain pending. Existing privacy-negative scenarios remain unchanged.

## Inputs and evidence

* Repository: <https://github.com/rdhepe/testrepo>
* Shared HLD: [HLD.pdf](../test-data/uc3-wf-01/documents/HLD.pdf)
* Word alternative: [HLD.docx](../test-data/uc3-wf-01/documents/HLD.docx)
* Shared DPIA: [DPIA.pdf](../test-data/uc3-wf-01/documents/DPIA.pdf)
* HLD source: [fixtures/documents.json](../fixtures/documents.json)
* HTTP routes and in-memory storage: [src/server.js](../src/server.js)
* Frontend requests: [public/app.js](../public/app.js)
* HLD assertions: [test/pack.test.js](../test/pack.test.js)
* Runtime storage reset check: [test/application.test.js](../test/application.test.js)

Use the same HLD/DPIA pair as the other cases, not a separate case-specific PDF.
The DPIA describes actual volatile storage; it does not override the HLD's
deliberately inconsistent PostgreSQL assertion. Upload the HLD, not this runbook
or the tests, as design evidence. Publish local changes before a GitHub-only run.

## Execute in UC3

1. Select the authorized repository commit and upload the shared HLD. Record
   the commit and document checksum from the pack manifest.
2. Run TC-DS-01 and confirm UC3 identifies both component assertions.
3. Expect the HTTP component to match, with citations to the frontend routes
   and GET/POST enrolment handlers in the server and browser submission code.
4. Expect the persistence mismatch to cite the HLD PostgreSQL assertion and
   the server's per-instance array initialization and `enrolments.push(record)`.
5. Confirm the overall result is Non-Compliant while retaining the HTTP match.
6. Record actual findings, citations, verdict, run ID and defects in the ignored
   `test-results` directory. Do not mark the UC3 run complete from local tests.

Expected mismatch finding: "The HLD specifies PostgreSQL persistence, but the
supplied implementation stores runtime enrolments in memory and resets them to
seed data on restart."

GitHub source review establishes implementation alignment, not actual deployed
state. The separate TC-DS-03 key configuration is undeployed and does not define
a database or service deployment. No deployed resource inventory is supplied.
Missing infrastructure definitions alone do not prove that a deployed
database is absent; deployed-state verification remains outside this run.

## Local checks

```powershell
node --test --test-name-pattern=TC-DS-01 test/pack.test.js
npm test
npm run pack:all
```

The tests preserve the HLD assertions and verify the actual service behavior,
including reset to synthetic seeds in a new application instance. Generation
refreshes the canonical documents and manifests. These checks validate the
fixture, not UC3 assessment accuracy. Use synthetic data only.
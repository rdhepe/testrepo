---
title: TC-PD-03 Privacy Statement Negative Test
description: Detect the deliberate absence of a user-facing privacy statement and link by comparing repository source with the DPIA requirement.
---

## Scenario

TC-PD-03 requires a publicly available, accessible privacy statement. The synthetic
Training Register Demo homepage registers employees through the existing API, but
deliberately omits the privacy statement and any link to one. The expected
application control verdict is **Non-Compliant**. A correct UC3 finding means the
negative test succeeds; it does not mean the application is compliant.

Use synthetic records only. Do not expose this unauthenticated demo publicly.
The existing undeclared `homeAddress` collection for TC-PD-01 remains unchanged.

## Inputs and source evidence

* Repository: <https://github.com/rdhepe/testrepo>
* Preferred upload: [DOC-01 DPIA.pdf](../test-data/uc3-doc-01/documents/DPIA.pdf), section S7, page 8
* Word alternative: [DOC-01 DPIA.docx](../test-data/uc3-doc-01/documents/DPIA.docx), section S7
* WF-01 alternative: [WF-01 DPIA.pdf](../test-data/uc3-wf-01/documents/DPIA.pdf), section Privacy statement requirement (TC-PD-03)
* Requirement source: [fixtures/doc-01.json](../fixtures/doc-01.json), annotation `REQ-PS-01`
* Homepage: [public/index.html](../public/index.html)
* Browser behavior: [public/app.js](../public/app.js)
* Served routes: [src/server.js](../src/server.js)

Upload one DPIA format, not the reviewer annotations or this runbook. SME approval
of the exact synthetic DPIA remains pending. Record the repository commit and the
uploaded document checksum from its pack manifest.

## Execute in UC3

1. Create or reopen the authorized assessment for Training Register Demo and
   provide the repository plus the updated DPIA.
2. Run the repository and document assessment for TC-PD-03.
3. Check that UC3 identifies the DPIA requirement: the homepage must link to a
   privacy statement before data submission, readable without authentication.
4. Check its source evidence. The server serves the homepage and browser script;
   the page has an enrolment form, and the script submits to `/api/enrolments`.
   Neither source supplies a privacy statement or link. No statement route is
   implemented in the supplied server.
5. Capture the actual finding, control verdict, source citations, document
   citation, commit, file hash, run ID and any defects under ignored `test-results`.
6. Confirm TC-PD-01 still reports the separate undeclared-field mismatch.

Expected finding: "The supplied frontend does not implement a privacy statement
or a link to one, despite the DPIA requirement."

Source inspection cannot prove live accessibility or rule out a notice supplied
by infrastructure or content outside the repository. Do not claim UC3 performed a
browser check. Deployed verification remains outstanding, and actual UC3 detection
must be recorded rather than assumed.

## Local checks

```powershell
npm test
npm run pack:doc
npm run pack -- --repository https://github.com/rdhepe/testrepo
npm start
```

Open <http://127.0.0.1:3100/> and register a fictional learner with an
`@example.test` address. The record appears in the current enrolments table and
is lost on restart. The page has no privacy statement or privacy link by design.
Local checks validate the fixture, not UC3 accuracy or enterprise compliance.
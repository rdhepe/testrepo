---
title: TC-PD-02 Missing Consent Negative Test
description: Compare the synthetic DPIA consent requirement with a registration frontend and API that collect and store enrolment information without consent.
---

## Scenario

TC-PD-02 requires personal data to be collected only with user consent. For this
synthetic scenario, the DPIA requires consent before enrolment submission and
storage. The frontend deliberately has no consent checkbox or prompt, its browser
script submits without a consent check, and the API stores valid enrolments
without a consent prerequisite.

The expected application control verdict is **Non-Compliant**. UC3 detecting the
defect means the negative test succeeds, not that the application is compliant.
The synthetic requirement is not a determination that employee consent is an
appropriate lawful basis in a real deployment. No actual legal basis, valid
consent or employee approval is asserted.

Use fabricated identities only. Do not expose the demo publicly. TC-PD-01's
undeclared address collection and TC-PD-03's missing privacy statement remain
unchanged. A privacy-statement link alone would not satisfy consent collection.

## Inputs and source evidence

* Repository: <https://github.com/rdhepe/testrepo>
* Shared upload: [DPIA.pdf](../test-data/uc3-wf-01/documents/DPIA.pdf), section S8, page 9
* Word alternative: [DPIA.docx](../test-data/uc3-wf-01/documents/DPIA.docx), section S8
* Shared design: [HLD.pdf](../test-data/uc3-wf-01/documents/HLD.pdf)
* Requirement source: [fixtures/doc-01.json](../fixtures/doc-01.json), annotation `REQ-CON-01`
* Registration form: [public/index.html](../public/index.html)
* Browser submission: [public/app.js](../public/app.js)
* Validation and in-memory storage: [src/server.js](../src/server.js)
* Regression evidence: [test/application.test.js](../test/application.test.js)

Upload one DPIA format, not this runbook or the reference annotations. SME approval
of the exact documents remains pending. Record the assessed commit and uploaded
document checksum from the corresponding pack manifest. Local changes must be
published before a GitHub-only assessment can inspect them.

## Execute in UC3

1. Provide the authorized repository reference and updated DPIA for Training
   Register Demo, then run the TC-PD-02 assessment.
2. Verify that UC3 identifies the DPIA requirement for consent before submission
   and storage. The DPIA determines whether consent is required for this scenario.
3. Review frontend findings first. The registration form collects employee
   information without a consent checkbox or prompt; the browser script submits
   its fields directly to `POST /api/enrolments` without checking consent.
4. Consider backend findings only if no frontend findings exist, following the
   worksheet's assessment order. The server validates enrolment fields, creates
   a record and adds it to its in-memory array without a consent prerequisite.
   Database consent-record requirements are outside this assessment scope.
5. Capture actual findings, verdict, source and DPIA citations, commit, document
   hash, run ID and defects in the ignored `test-results` directory.
6. Confirm the separate TC-PD-01 and TC-PD-03 scenarios remain detectable.

Expected finding: "The supplied registration frontend collects and submits
personal data without collecting the consent required by the DPIA."

Repository inspection cannot prove whether a person actually provided valid
consent before every write. That requires manual verification; do not report
source analysis as a runtime consent audit. Actual UC3 detection remains pending.

## Local checks

```powershell
node --test --test-name-pattern=TC-PD-02 test/application.test.js
npm test
npm run pack:all
```

The TC-PD-02 test checks the served frontend and script for the deliberate missing
control, posts synthetic enrolment fields without consent, expects HTTP 201 and
confirms that the created record is retrievable. Runtime additions are held only
in memory and disappear on restart. No consent database or new consent field is
introduced. These checks validate the fixture, not UC3 accuracy or legal compliance.
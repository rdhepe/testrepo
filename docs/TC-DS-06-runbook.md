---
title: TC-DS-06 Sensitive Data Audit Logging Test
description: Detect missing read and create audit logging in the existing synthetic enrolment application.
---

## Scenario

The existing application deliberately reads and creates employee enrolment records
without audit events. For this synthetic control these records are designated
protected sensitive data, not special-category personal data. Expected DS6 verdict:
Non-Compliant. Keep the missing audit control intact for this negative fixture.

Audit events are required to include authenticated user identity, UTC timestamp,
action, record reference and outcome. Record the attempt before access or mutation
and its outcome when known, linked by a correlation identifier. Do not log full
personal-data payloads, learner names, email addresses, credentials or tokens.
The startup URL message is not an audit trail. Authentication remains absent as
the separate DS5 condition; a submitted employee ID is not a verified actor.

Only read and create are implemented. There are no update/delete endpoints or
database operations. Do not claim complete CRUD or database audit coverage.

## Inputs

* Shared [test-data/uc3-wf-01/documents/HLD.pdf](../test-data/uc3-wf-01/documents/HLD.pdf), section TC-DS-06
* Shared [test-data/uc3-wf-01/documents/DPIA.pdf](../test-data/uc3-wf-01/documents/DPIA.pdf), S11 on page 12
* Enrolment handlers in [src/server.js](../src/server.js)
* Local checks in [test/application.test.js](../test/application.test.js) and [test/pack.test.js](../test/pack.test.js)

Use the same HLD/DPIA pair for every case. Existing DPIA sections S1-S10 retain
their page references. REQ-AUDIT-01 is a requirement, not a verified finding.

## Local Automated Check

From the repository root, with Node.js 22 or newer and dependencies installed:

```powershell
node --test --test-name-pattern=TC-DS-06 test/application.test.js test/pack.test.js
npm test
```

The isolated-server test checks read HTTP 200, create HTTP 201, retrieval of the
created record and zero calls to console log/info/warn/error/debug during these
requests. It also confirms PUT, PATCH and DELETE return 404. The document test
checks shared audit requirements. The full pack test verifies the page-12
annotation and generated document checksums.

A passing test confirms the intentional deficiency. Console spies alone do not
exclude every possible audit sink; inspect the current handler source, imports
and dependencies as well. There is no configured application audit sink in this
implementation. These checks do not run UC3 or prove deployed behavior.

To regenerate the shared evidence after future fixture edits:

```powershell
npm run pack:all
```

## Manual API Check

Start the app in one terminal using an unused port:

```powershell
$env:PORT = '3106'
npm start
```

In a second terminal, use synthetic data only. Change the port if needed:

```powershell
$base = 'http://127.0.0.1:3106'
(Invoke-WebRequest "$base/api/enrolments").StatusCode
$body = @{
  employeeId = 'SYN-AUDIT-MANUAL-001'
  employeeName = 'Synthetic Audit Tester'
  workEmail = 'audit.tester@example.test'
  courseCode = 'DEMO-SAFETY-101'
  completionStatus = 'enrolled'
} | ConvertTo-Json
$created = Invoke-WebRequest "$base/api/enrolments" -Method Post -ContentType 'application/json' -Body $body
$created.StatusCode
($created.Content | ConvertFrom-Json).id
Invoke-RestMethod "$base/api/enrolments"
```

Expect 200, then 201 and a generated UUID. The final list contains
SYN-AUDIT-MANUAL-001. The server terminal shows the startup URL but no read/create
audit events. Client output is not a server audit trail. Capture these results
locally under ignored `test-results`; stop with Ctrl+C. Runtime additions disappear
on restart. Do not expose this application publicly.

## Execute in UC3

1. Publish the DS6 changes before GitHub-only assessment. Record the assessed
   commit from <https://github.com/rdhepe/testrepo>; older commits lack DS6 requirements.
2. Upload the shared HLD and DPIA. Record their hashes from
   [test-data/uc3-wf-01/manifest.json](../test-data/uc3-wf-01/manifest.json).
3. Select repository type App, not Infra or Database. Run application analysis
   and confirm the execution includes the enrolment handlers and JavaScript
   CodeQL audit-logging query coverage before assessing TC-DS-06.
4. Expect a Non-Compliant finding identifying GET's direct enrolment response
   and POST's memory mutation/201 response without audit events. Compare against
   HLD TC-DS-06 and DPIA S11, REQ-AUDIT-01 on page 12. Require actual source citations.
5. A missing analysis artifact, unsupported JavaScript query or NOT APPLICABLE
   result is an analysis gap, not proof of compliance. Record the actual message
   and verify UC3's ingestion/query support. Do not manufacture analysis artifacts
   inside this repository or add a console message to force recognition.
6. Record run ID, commit, documents, actual findings, source citations and verdict
   under ignored `test-results`. SME review and actual UC3 execution remain separate
   from passing fixture tests.

Expected finding: "Protected enrolment read and create operations have no audit
events recording actor identity, timestamp, action, record reference and outcome."

GitHub-only review cannot establish live delivery, retention, tamper protection
or logging supplied by external infrastructure. A pre-operation log statement
alone does not establish a recorded outcome. UC3's exact query support has not
been verified against this fixture.
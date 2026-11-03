---
title: TC-DS-05 Identity Provider and MFA Test
description: Detect deliberately unauthenticated employee enrolment access against the internal application's approved identity-provider and MFA requirement.
---

## Scenario

For this synthetic scenario, Training Register Demo is an internal employee
application. Enrolment records are designated protected sensitive data for this
control, not special-category personal data. GET and POST `/api/enrolments` must
require Microsoft Entra authentication with MFA.

The application deliberately has no identity-provider integration or authentication
gate. Anonymous reads and valid writes succeed, and an invalid bearer token is
ignored. Expected TC-DS-05 verdict: Non-Compliant. Do not add authentication to
repair this negative fixture. Existing privacy-negative cases remain unchanged.

The worksheet assumes MFA when an identity provider is used. That is an assessment
assumption, not proof of enforcement. No provider protects these routes, so it
cannot satisfy this scenario. Do not claim that a real tenant's MFA is disabled.

## Inputs

* Shared [HLD.pdf](../test-data/uc3-wf-01/documents/HLD.pdf), section TC-DS-05
* Shared [DPIA.pdf](../test-data/uc3-wf-01/documents/DPIA.pdf), S10 on page 11
* API handlers in [src/server.js](../src/server.js)
* Requests in [public/app.js](../public/app.js)
* Regression checks in [test/application.test.js](../test/application.test.js)

Use the same shared HLD/DPIA pair as all other cases.

## Local automated check

From the repository root with Node.js 22 or newer and dependencies installed:

```powershell
node --test --test-name-pattern=TC-DS-05 test/application.test.js
```

The test starts an isolated loopback server and closes it afterwards. It checks
anonymous read, invalid-token read, anonymous creation and anonymous retrieval.
A passing test confirms the deficiency exists, not that the app is compliant.

## Manual API check

Start the synthetic app in one terminal:

```powershell
$env:PORT = '3105'
npm start
```

Use an unused port if 3105 is occupied, and update `$base` below accordingly.
In a second terminal, with no login, cookies or real tokens:

```powershell
$base = 'http://127.0.0.1:3105'
(Invoke-WebRequest "$base/api/enrolments").StatusCode
(Invoke-WebRequest "$base/api/enrolments" -Headers @{ Authorization = 'Bearer SYNTHETIC-INVALID-NOT-A-REAL-TOKEN' }).StatusCode
$body = @{
  employeeId = 'SYN-AUTH-MANUAL-001'
  employeeName = 'Synthetic Authentication Tester'
  workEmail = 'auth.tester@example.test'
  courseCode = 'DEMO-SAFETY-101'
  completionStatus = 'enrolled'
} | ConvertTo-Json
(Invoke-WebRequest "$base/api/enrolments" -Method Post -ContentType 'application/json' -Body $body).StatusCode
Invoke-RestMethod "$base/api/enrolments"
```

Expect HTTP 200, HTTP 200 and HTTP 201, respectively. The final response includes
`SYN-AUTH-MANUAL-001`. These responses demonstrate missing authentication. A
protected implementation would reject unauthenticated and invalid-token access,
typically with 401, rather than returning records. Stop the server with Ctrl+C;
runtime additions disappear on restart. Never expose this app publicly.

## Execute in UC3

1. Publish the scoped changes before GitHub-only assessment. Record the commit
   from <https://github.com/rdhepe/testrepo>.
2. Upload the shared HLD and DPIA; record hashes from the
   [manifest](../test-data/uc3-wf-01/manifest.json).
3. Run TC-DS-05 using the internal-application classification.
4. Expect a Non-Compliant finding citing the unguarded enrolment handlers and
   the requirement for Entra authentication with MFA. A provider name in a
   requirement is not implemented authentication.
5. Confirm UC3 distinguishes missing application authentication from unknown live
   tenant MFA configuration. GitHub-only review cannot attempt actual MFA login.
6. Record actual findings, citations, verdict and run ID under ignored
   `test-results`. Local fixture tests do not complete the UC3 run or SME review.

Expected finding: "Employee enrolment records are accessible without
authentication. No approved identity-provider integration protects the required
read and create routes."
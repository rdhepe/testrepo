---
title: TC-PD-01 Data Minimization Negative Test
description: Compare declared DPIA fields against an intentional extra personal-data field collected and stored by the synthetic API.
---

## Case and prerequisite

TC-PD-01 checks that only required personal data is collected and stored. The
compliant expectation is that extra data is rejected. This fixture deliberately
violates that expectation so UC3 has a known defect to detect.

Use synthetic data only. Data-owner and SME approval remain pending; obtain actual
approval for the fixture and required fields before marking that prerequisite met.
No approval is manufactured by this repository.

## Inputs and comparison

Upload the shared [DPIA.pdf](../test-data/uc3-wf-01/documents/DPIA.pdf), or its Word
alternative, and point UC3 at the repository revision containing the changed
[src/server.js](../src/server.js). Do not use a previous main revision that still
rejects the extra field. Do not upload this runbook or the tests as the DPIA.

Use this same DPIA and the shared [HLD.pdf](../test-data/uc3-wf-01/documents/HLD.pdf)
for every implemented test case. Regenerate all inputs with `npm run pack:all`.

The DPIA inventory intentionally remains the original baseline. Its S2 (PDF page 3) declares
`employeeId`, `employeeName`, `workEmail`, `courseCode`, `completionStatus` and the
generated `id`. S3 (page 4) ties these to training registration, work contact,
completion tracking and record identification. S4 (page 5) says additional client
fields cannot be submitted. `ownerEmail` is an application contact, not a learner
field. The local tester must confirm field necessity with the data owner.

The current code additionally validates, collects, stores and returns optional
`homeAddress`. It has no declaration or purpose in that DPIA. It is not in the
metadata field list either, so UC3 must inspect code rather than rely on metadata.
Optional collection still counts as personal-data processing.

## Execute the worksheet steps

1. Validate and record actual data-owner approval for the declared processing.
2. Start the API with `npm start` in a separate terminal, then submit the extra
   synthetic field using the commands below.
3. Check stored records: find the returned `id` and verify `homeAddress` remains.
   Runtime storage is process memory, not disk or SQL, and resets on restart.
4. Run the UC3 assessment with the DPIA and the changed repository revision.
5. Open TC-PD-01 details and capture the field comparison, document and code
   citations, explanation, verdict, repository SHA and assessment ID. Keep actual
   evidence in the ignored `test-results` directory.

Run from the repository root in PowerShell:

```powershell
$body = Get-Content -Raw ./test-data/tc-pd-01/request.json
$created = Invoke-RestMethod -Uri http://127.0.0.1:3100/api/enrolments -Method Post -ContentType application/json -Body $body
$created
$records = Invoke-RestMethod -Uri http://127.0.0.1:3100/api/enrolments
$records | Where-Object { $_.id -eq $created.id }
```

The POST returns HTTP 201 and a generated `id`. Both responses include
`homeAddress: 1 Synthetic Demo Street, Fictional Town`. Omitting the optional field
still succeeds; unrelated fields such as `nationalId` remain rejected.

## What UC3 must detect

* Extract the six declared record fields and their purposes from the DPIA.
* Identify `homeAddress` in executable application code as extra personal data,
  even though it is optional and absent from the metadata list.
* Cite the address validation, assignment to the enrolment record, storage in the
  enrolment array and readback path, and the DPIA field and collection sections.
* Explain that residential address collection has no declared necessity for the
  stated training purposes and contradicts the additional-field restriction.
* Assess TC-PD-01 as Non-Compliant for this deliberate mismatch. If using the
  supplied worksheet's binary scoring, the expected control score is 0.

UC3 reporting Compliant because it found no PII, ignored optional fields or found
no SQL database is a failed detection. A correct Non-Compliant result is a
successful negative test, not a compliant application. These are expected results;
actual UC3 execution has not been performed here.

## Local verification

`node --test test/application.test.js` checks the undeclared-field mismatch,
synthetic request, successful address storage/readback, invalid address rejection,
and existing API behavior. It does not validate UC3 or grant processing approval.
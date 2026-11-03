---
title: TC-DS-03 Key Storage and Rotation Test
description: Assess restricted managed key storage configuration and intentionally missing automatic rotation using the shared assessment documents.
---

## Scenario

The synthetic requirement is restricted managed key storage and automatic rotation
at least every 90 days. This interval is a fixture requirement, not an asserted
enterprise standard. The expected overall configuration verdict is Non-Compliant.

The [key template](../infra/tc-ds-03-key.json) defines `Resources.EnrolmentKey`
as an `AWS::KMS::Key` with `AWS_KMS` origin, symmetric encryption, and separate
parameterized administrator and application principals. The application principal
has only encrypt, decrypt, data-key generation and key-description permissions.
The template requires distinct roles and commits no key material or credentials.

`EnableKeyRotation` and `RotationPeriodInDays` are intentionally absent. Permission
to call `kms:EnableKeyRotation` does not enable a schedule. An expiry, retention or
deletion setting is not rotation. In a KMS key policy, `Resource: "*"` denotes the
attached key; it does not grant access to a public principal.

> [!WARNING]
> Do not deploy this template or enter real account identifiers. It is an
> undeployed configuration fixture, not connected to the demo application.
> Do not claim the running application encrypts enrolments or has a live KMS key.

## Inputs

* Shared [HLD.pdf](../test-data/uc3-wf-01/documents/HLD.pdf), section TC-DS-03
* Shared [DPIA.pdf](../test-data/uc3-wf-01/documents/DPIA.pdf), S9 on page 10
* [infra/tc-ds-03-key.json](../infra/tc-ds-03-key.json)
* Regression checks in [test/pack.test.js](../test/pack.test.js)

Use the same HLD/DPIA pair as every other case. Tests and this runbook are the
fixture oracle, not independent evidence that a control works.

## Local checks

From the repository root with Node.js 22 or newer and dependencies installed:

```powershell
node --test --test-name-pattern=TC-DS-03 test/pack.test.js
npm run pack:all
```

Expect passing local tests: they preserve the intentional deficiency, not a
compliant security control. JSON parsing and targeted assertions do not constitute
provider-side CloudFormation validation, deployment validation or a live KMS test.

## Execute in UC3

1. Publish the scoped changes before a GitHub-only run, then record the repository
   commit. Repository: <https://github.com/rdhepe/testrepo>.
2. Upload the shared HLD and DPIA. Record their hashes from the
   [manifest](../test-data/uc3-wf-01/manifest.json).
3. Run TC-DS-03 against that repository revision. Confirm UC3 can inspect the key
   template, not only JavaScript files. If IaC is unsupported, record the case as
   not assessable from the supported input, rather than inventing a result.
4. Expect recognition of restricted managed key storage configuration, citing
   `Origin`, `KeyPolicy`, role separation and the limited application actions.
5. Expect a missing-rotation finding citing the 90-day requirement and the
   absence of `EnableKeyRotation` and `RotationPeriodInDays` on `EnrolmentKey`.
6. Expect an overall Non-Compliant configuration verdict. Reject a full runtime
   compliance claim: the key template is not deployed or integrated with the app.
7. Record the actual verdict, citations, run ID and gaps under ignored
   `test-results`. SME approval and UC3 execution remain pending until performed.

Expected finding: "The proposed managed key has restricted access configuration,
but automatic rotation is not configured as required by the 90-day control."

Live key existence, effective permissions, rotation history and application use
cannot be established by this repository-only test.
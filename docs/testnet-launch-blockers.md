# Testnet Launch Blockers Audit

> Historical audit updated 2026-06-04. This file no longer defines the active launch gate.
> Current source of truth: `contracts/deployments/testnet.vc-v3.full.json` + `contracts/deployments/testnet.simple-launch.json`.

## Current Status

The previous 6-contract testnet blocker audit has been superseded by the VC v3 full + SimpleLaunch registry gate.

| Area | Current Status |
| --- | --- |
| VC v3 full testnet contracts | Deployed and verified |
| SimpleLaunch testnet contracts | Deployed and flow-tested |
| SaleVesting buyer flow | Completed |
| Testnet D1 registry | Reviewed plan only; not executed |
| Worker registry | Draft code path; E2E pending populated testnet D1 |
| Frontend registry | Draft code path; E2E pending Worker registry |
| Mainnet deployment | Not started |

## Active Registry Requirement

Worker/frontend readiness now requires 14 testnet contracts:

| Group | Contracts |
| --- | --- |
| Base platform | `VC_JETTON`, `FUND`, `VC_REWARD_POOL`, `EARLY_FUNDRAISING`, `LAUNCH_FEE`, `TOKEN_LAUNCHER` |
| VC v3 full | `SALE_VESTING`, `TEAM_VESTING`, `DEVELOPER_REWARD_POOL`, `ECOSYSTEM_REWARD_POOL`, `DEVELOPMENT_FUND`, `RESERVE_VAULT` |
| SimpleLaunch | `LAUNCH_ESCROW`, `SIMPLE_LAUNCH_CAMPAIGN` |

`PROJECT_TOKEN` is deployed evidence for SimpleLaunch activation, but it is not part of the frontend/Worker required-contract fail-closed list unless a future product flow needs it directly.

## Frozen Historical Notes

- The old "6 contracts" acceptance criterion is frozen. It applied only before VC v3 full + SimpleLaunch deployment.
- `EarlySubscription`, `Strategic`, and legacy `EARLY_SUB` naming remain removed/frozen and must not be restored.
- `testnet.vc-v3.json` and dry-run plan manifests are intermediate evidence only. They are not registry truth.
- D1 execution remains a separate approved testnet task. This document does not authorize D1 or production changes.

## Remaining Pre-Mainnet Blockers

| Blocker | Required Outcome |
| --- | --- |
| Testnet D1 registry execution | Approved testnet-only execution with backup and execution record |
| Worker registry E2E | 14 required contracts returned or fail-closed behavior verified |
| Frontend E2E | Missing-contract disabled state and wrong-network block verified |
| Mainnet signer/admin plan | Multisig/timelock or explicitly approved admin policy |
| Final audit | Human approval checklist complete |

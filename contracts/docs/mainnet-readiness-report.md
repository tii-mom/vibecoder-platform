# Mainnet Readiness Report

> Status: not ready for mainnet. Mainnet deployment has not been executed.
> Updated: 2026-06-04. Testnet flows complete; D1/Worker/frontend E2E and mainnet approvals remain.

## Current Readiness

| Area | Status |
| --- | --- |
| VC_JETTON testnet get-method verification | OK |
| VC v3 full testnet manifest | OK — `contracts/deployments/testnet.vc-v3.full.json` |
| SaleVesting testnet deployment | OK |
| TeamVesting testnet deployment | OK |
| DeveloperRewardPool testnet deployment | OK |
| EcosystemRewardPool testnet deployment | OK |
| DevelopmentFund testnet deployment | OK |
| ReserveVault testnet deployment | OK |
| VC v3 full get-method verification | OK — `npm run verify:vc-v3:full:testnet` |
| VC v3 full balance verification | OK — `npm run verify:vc-v3:full:balances` |
| TeamVesting flow | OK — claim/feed evidence recorded |
| SaleVesting flow | OK — 99 TON buyer flow completed |
| VC v3 pool live flows | Get-method and balance verification complete; extra admin-operation flows optional for final audit |
| SimpleLaunch v1 | OK — deployed and success/failure-refund flows completed |
| Testnet D1 reviewed plan | Reviewed; not executed |
| Worker registry E2E | Pending populated testnet D1 |
| Frontend registry E2E | Pending Worker registry E2E |
| Production D1 SQL | Not executed |
| Mainnet deployment | Not executed |

## Mainnet Blockers

- Execute testnet D1 registry only in a separately approved testnet D1 task with backup.
- Deploy/verify Worker registry and frontend against populated testnet D1.
- Keep production D1 SQL out of scope until separate approval.
- Finalize VC_JETTON mainnet admin policy as verified multisig/timelock or admin revoke.
- Complete final audit and human approval checklist.

## Verification Baseline

```bash
cd contracts
npm run build:all
npm run typecheck
npm test -- --runInBand
npm run verify:get-methods
npm run verify:vc-v3:full:testnet
npm run verify:vc-v3:full:balances
npm run test:vc-v3:flows:plan
```

Latest known result: contracts typecheck and SimpleLaunch verification passed; VC v3 and SimpleLaunch flows completed on testnet. Worker typecheck and frontend build pass on their draft integration branches.

## Boundaries

| Item | Status |
| --- | --- |
| mainnet deployed | NO |
| production D1 SQL executed | NO |
| secrets committed | NO |
| Worker/frontend production logic changed | NO |
| testnet addresses used as mainnet addresses | NO |

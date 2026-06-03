# Mainnet Readiness Report

> Status: not ready for mainnet. Mainnet deployment has not been executed.

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
| TeamVesting flow | Partial OK — already claimed 40,000,000 VC; duplicate/unclaimed live checks still need final gate coverage |
| SaleVesting flow | Partial OK — get-methods/admin price feed OK; 99 TON buyer buy/claim flow is still a hard blocker |
| VC v3 pool live flows | Pending dedicated testnet flow checks for developer/ecosystem/development/reserve operations |
| SimpleLaunch v1 | Plan frozen only; implementation and testnet deployment pending |
| Testnet D1 reviewed plan | Drafted; not executed |
| Production D1 SQL | Not executed |
| Mainnet deployment | Not executed |

## Mainnet Blockers

- Complete SaleVesting 99 TON buyer buy/claim flow with a funded testnet buyer wallet.
- Complete dedicated testnet flow verification for DeveloperRewardPool, EcosystemRewardPool, DevelopmentFund, and ReserveVault.
- Implement SimpleLaunchCampaign v1 and LaunchEscrow v1.
- Deploy and flow-test SimpleLaunch v1 on testnet.
- Review D1 SQL plans manually; production D1 SQL remains out of scope until separate approval.
- Finalize VC_JETTON mainnet admin policy as verified multisig/timelock or admin revoke.
- Produce final pre-mainnet readiness package after all testnet blockers are closed.

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

Latest known result: build/typecheck passed; 14 test suites and 93 tests passed; full VC v3 testnet get-method and balance verification passed.

## Boundaries

| Item | Status |
| --- | --- |
| mainnet deployed | NO |
| production D1 SQL executed | NO |
| secrets committed | NO |
| Worker/frontend production logic changed | NO |
| testnet addresses used as mainnet addresses | NO |

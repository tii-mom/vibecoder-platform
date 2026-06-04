# Platform v3 Remaining Contracts Testnet Plan

> Status: deployed and funded on testnet. Historical preparation plan retained as evidence. Testnet only.

## Contracts

| Contract | Pool | Status |
| --- | ---: | --- |
| DeveloperRewardPool | 100,000,000 VC | Deployed and funded |
| EcosystemRewardPool | 100,000,000 VC | Deployed and funded |
| DevelopmentFund | 100,000,000 VC | Deployed and funded |
| ReserveVault | 100,000,000 VC | Deployed and funded |

## Current Source Of Truth

- Deployment manifest: `contracts/deployments/testnet.vc-v3.full.json`
- Deployment report: `contracts/docs/testnet-vc-v3-full-deployment-report.md`
- Funding/flow report: `contracts/docs/vc-v3-testnet-funding-flow-report.md`
- D1 SQL executed = NO.
- Mainnet deployed = NO.

## Historical Pre-Deployment Checklist

- Review interface freeze entries.
- Add a testnet deployment script and manifest entries.
- Run `npm run build:all`, `npm run typecheck`, `npm test -- --runInBand`, and `npm run verify:get-methods`.
- Ensure execute mode refuses `TON_NETWORK=mainnet`.
- Do not execute D1 SQL.

## Dry-run Commands

```bash
cd contracts
npm run deploy:vc-v3:full:testnet:plan
npm run verify:vc-v3:full:testnet
npm run mint:vc-v3:full:testnet:plan
npm run verify:vc-v3:full:balances
```

The deploy plan writes `contracts/deployments/testnet.vc-v3.full.plan.json`. That plan file is historical evidence only; registry truth is `contracts/deployments/testnet.vc-v3.full.json`.

## Historical Execute Command

Execution is testnet-only and must be explicitly confirmed:

```bash
cd contracts
TON_NETWORK=testnet CONFIRM_TESTNET_FULL_V3_DEPLOY=YES npm run deploy:vc-v3:full:testnet
TON_NETWORK=testnet CONFIRM_TESTNET_FULL_V3_MINT=YES npm run mint:vc-v3:full:testnet
```

The execute script refuses `TON_NETWORK=mainnet`, requires `DEPLOYER_MNEMONIC`, and requires `VC_ADMIN_ADDRESS`.

## Deployment Report Requirements

- Testnet addresses.
- Self VC wallets.
- Funding source and tx hash status.
- Get-method verification status.
- Flow test status.
- D1 SQL executed = NO.
- Mainnet deployed = NO.

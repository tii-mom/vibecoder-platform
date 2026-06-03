# Mainnet Deployment Runbook

> Status: draft only. Do not execute mainnet deployment from this task.

## Preconditions

- `contracts/docs/mainnet-readiness-report.md` has no open blockers.
- Final testnet manifests and deployment reports are reviewed.
- SaleVesting 99 TON buyer testnet flow is completed.
- SimpleLaunch v1 is implemented, deployed, and flow-tested on testnet.
- Production D1 SQL has a separate approval record.
- VC_JETTON mainnet admin destination is verified as multisig/timelock, or admin revoke is explicitly approved.
- Secrets are loaded from local environment only and never committed.

## Dry-Run Sequence

```bash
cd contracts
npm run build:all
npm run typecheck
npm test -- --runInBand
npm run verify:get-methods
npm run premainnet:check
npm run plan:mainnet
npm run plan:vc-distribution
```

## Execution Gates

- Human approval for mainnet network.
- Human approval for every deploy transaction group.
- Human approval for VC mint/distribution.
- Human approval for VC_JETTON mint disable plus admin revoke or admin transfer.
- Human approval before any production D1 SQL.
- Human review of every tx hash before public launch.

## Post-Deploy Verification

- Verify every mainnet contract address with get methods.
- Verify every self VC wallet address.
- Verify VC_JETTON total supply, mint disabled flag, and admin policy.
- Record tx hashes from explorer or deployment tooling.
- Publish final manifest and readiness report.

## Explicitly Out Of Scope Here

- Mainnet deploy.
- Mainnet VC mint.
- Production D1 SQL execution.
- Worker/frontend production cutover.

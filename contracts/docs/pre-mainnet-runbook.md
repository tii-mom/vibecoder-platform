# Pre-Mainnet Runbook

Last updated: 2026-06-04

This runbook prepares the project for mainnet review. It does not broadcast mainnet transactions and does not modify remote Cloudflare D1 unless `--apply` is explicitly passed to the sync helper.

## 1. Generate Mainnet Platform Dry-Run Manifest

Required environment:

```bash
TON_NETWORK=mainnet
ALLOW_MAINNET_PLAN=1
MAINNET_ADMIN_ADDRESS=<personal admin wallet>
VC_METADATA_URI=<mainnet metadata uri>
VC_EARLY_OPS_ADDRESS=<early ops wallet>
VC_LIQUIDITY_ADDRESS=<liquidity wallet>
VC_TEAM_LOCKUP_ADDRESS=<team lockup wallet>
```

Command:

```bash
cd contracts
npm run plan:mainnet
```

Output:

```text
contracts/deployments/mainnet.platform.dry-run.json
```

Admin policy for this plan: personal wallet retained. No revoke is planned in this batch.

## 2. Generate VC Distribution Dry-Run

```bash
cd contracts
npm run plan:vc-distribution
```

Expected total:

```text
980,000,000 VC
```

The plan validates Fund, RewardPool, EarlyFundraising, Liquidity, EarlyOps, and TeamLockup recipients.

## 3. Generate D1 Sync SQL

Testnet reviewed registry:

```bash
sed -n '1,220p' worker/sql/testnet-contract-registry-reviewed.sql
```

Mainnet dry-run:

```bash
node tools/sync-platform-contracts.mjs --network=mainnet --manifest=contracts/deployments/mainnet.platform.dry-run.json
```

The sync helper prints SQL only by default. Do not pass `--apply` until the remote D1 update is explicitly approved. The reviewed testnet registry SQL must retain `ROLLBACK` until a separate testnet D1 execution task confirms the target database and backup.

## 4. Run Full Gate

```bash
cd contracts
npm run premainnet:check
```

If mainnet environment variables are missing, the gate skips mainnet dry-run checks and reports the missing keys. Once all mainnet dry-run variables are present, the gate includes platform manifest and distribution dry-run validation.

## Manual Review Checklist

- VC metadata URI opens and returns wallet-compatible JSON.
- Mainnet admin wallet is the intended personal admin wallet.
- EarlyOps, Liquidity, TeamLockup, and EarlyTreasury addresses are final.
- `VC_JETTON` admin remains retained by policy.
- Testnet registry source is `contracts/deployments/testnet.vc-v3.full.json` + `contracts/deployments/testnet.simple-launch.json`.
- Testnet D1 registry covers 14 required Worker/frontend contracts: base 6 + VC v3 full 6 + SimpleLaunch 2.
- Historical `testnet.platform.json`, `testnet.vc-v3.json`, and dry-run plan manifests are not registry truth.
- No mainnet deployment, mint, D1 remote update, Worker deploy, or frontend deploy is performed in this preparation batch.

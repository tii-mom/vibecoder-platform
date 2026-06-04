# Pre-Mainnet Readiness

Last updated: 2026-06-04

## Testnet Deployment

Current registry source:

- `contracts/deployments/testnet.vc-v3.full.json`
- `contracts/deployments/testnet.simple-launch.json`

| Contract | Testnet address |
| --- | --- |
| `VC_JETTON` | `UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf` |
| `FUND` | `UQADQbeXROSyyCBwE2qPuhr2cbE0hXgWhVCJawR9UVK9CH0Q` |
| `VC_REWARD_POOL` | `UQD6Zak3m1RdCA1OOIMFSh3fF6VrsgBIwxLcpn1o76YUiVZN` |
| `EARLY_FUNDRAISING` | `UQBXX3nt12ZKmeY9ITF6G_YC4eh3JCspxnOCX762sBDWdqDD` |
| `LAUNCH_FEE` | `UQBs3qGxQ5KMPLM1aQfolsc6uoLfHaFtZ3XT0ZtNN9hXuzW-` |
| `TOKEN_LAUNCHER` | `UQAYzEOHPZgHeS9gmJxGBUFJrvkn2JnBCv4uD2OmkK_FeSXs` |
| `SALE_VESTING` | `UQAV6noSRUR7C83RwCB3T4XV0ylVqCAs_Crf1N5aHp6KzScm` |
| `TEAM_VESTING` | `UQD24kG-Pnl2OyJAs2hYtbRnBVOkgtsdhhD6z14u46NfSkRF` |
| `DEVELOPER_REWARD_POOL` | `UQCZFgdSfL4uGwExeG5wGMo96Aly8Lc5sx_Sf_HDpm27b9JD` |
| `ECOSYSTEM_REWARD_POOL` | `UQA-icYnrMhyb7Qe-wvBDH2k9g5a0is_z-jRfKHmW-HeaqV5` |
| `DEVELOPMENT_FUND` | `UQDJio3xtfCzu7TWhmxc8r1IeGyC2V7Hr0zLo3LTlbHkNm16` |
| `RESERVE_VAULT` | `UQCoVCCLCf7RxJ7BykJ4UlbhrtPI2I1894yLL2UkAXKiZ6vw` |
| `LAUNCH_ESCROW` | `UQAbBqEAuArxhgvAja3dP3tF5CsJ6s3NyMtWRV6unkjEd24h` |
| `SIMPLE_LAUNCH_CAMPAIGN` | `UQB2khuJechrKt9P2xADTWJVY7iQQF8GXOeHNbtLADdZjgxC` |

Removed legacy contracts: `EarlySubscription`, `Strategic`.

## VC Distribution

Admin has not been revoked on testnet. Current chain check returns `adminRevoked: false`, `mintable: -1`, and admin `UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq`.

This is intentional for testnet verification. The current mainnet dry-run policy retains `VC_JETTON` admin on the personal admin wallet. No admin revoke is planned in this preparation batch.

| Recipient | VC |
| --- | ---: |
| `FUND` | 250,000,000 |
| `VC_REWARD_POOL` | 450,000,000 |
| `EARLY_FUNDRAISING` | 100,000,000 |
| Liquidity wallet `0QDsx-vPapMJyIh3LYEQXAF_wp0iAWk8I6ZN7Vw79zqTDIjo` | 50,000,000 |
| Early ops/support wallet `0QCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQU_g` | 30,010,002 |

Verified total supply: 980,010,002 VC.

## Verification

Commands run successfully:

```bash
cd contracts
npm run typecheck
npm test -- --runInBand
npm run deploy:testnet:plan
npm run deploy:testnet
npm run verify:get-methods
npm run mint:vc
npm run verify:vc-jetton
npm run premainnet:check
```

Additional chain checks completed:

- `VC_JETTON.get_jetton_data` returned total supply 980,010,002 VC.
- `VC_JETTON.get_wallet_address` and VC wallet `get_wallet_data` are available for indexers.
- `FUND` VC wallet balance: 250,000,000 VC.
- `VC_REWARD_POOL` VC wallet balance: 450,000,000 VC.
- `EARLY_FUNDRAISING` VC wallet balance: 100,000,000 VC.
- Liquidity VC wallet balance: 50,000,000 VC.
- Early ops/support VC wallet balance: 30,010,002 VC.
- TonAPI testnet recognizes the current VC master and includes it in the early ops/support account jetton balances.
- Full pre-mainnet gate `npm run premainnet:check` passed.
- VC v3 full deployment and balance verification passed.
- SaleVesting 99 TON buyer flow completed.
- SimpleLaunch success and failure/refund flows completed.
- Testnet D1 registry has reviewed SQL but has not been executed.

## Mainnet Blockers

- Do not deploy mainnet from `scripts/deploy-platform-testnet.ts`; it refuses `TON_NETWORK=mainnet` by design.
- Mainnet has a dry-run planning script only: `npm run plan:mainnet`. It does not broadcast transactions.
- Mainnet VC distribution has a dry-run planning script only: `npm run plan:vc-distribution`. It does not mint.
- `contracts/deployments/mainnet.platform.dry-run.json` and `contracts/deployments/mainnet.vc-distribution.dry-run.json` are review artifacts. Regenerate them with final mainnet addresses before approval.
- D1 sync is dry-run by default through `node tools/sync-platform-contracts.mjs`; do not pass `--apply` until remote D1 update is explicitly approved.
- Run a final external security review over Tolk contracts before mainnet.
- Current policy retains `VC_JETTON` admin on a personal wallet for mainnet dry-run planning.
- Deprecated `EarlySubscription`/`Strategic` wrappers, compile entries, tests, old deployment scripts, and source files have been removed.

## Preparation Runbook

See `contracts/docs/pre-mainnet-runbook.md`.

# SimpleLaunch v1 Testnet Deployment Report

> Status: RPC BLOCKED. All pre-deployment checks passed. Real testnet deployment pending TonCenter RPC recovery.

## Deployment

| Item | Value |
| --- | --- |
| **Network** | testnet |
| **Executed** | NO (RPC 504 blocking) |
| **Manifest** | `contracts/deployments/testnet.simple-launch.plan.json` |
| **Status** | planned |
| **Generated at** | `2026-06-03T17:46:38.785Z` |
| **Deployer** | `UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq` (dry-run) |

### Contract Addresses (predicted, not deployed)

| Contract | Predicted Address | Status |
| --- | --- | --- |
| `SIMPLE_LAUNCH_CAMPAIGN` | `UQCsmFhjHmFmExMopMA8UnWK6hxn-uaoo161VrWog0Cnxk3Y` | planned |
| `LAUNCH_ESCROW` | `UQCjSgUHoTVwScc-ahTXMSi7HO8z0g8WUGmXTyCa1G4WWSGo` | planned |
| `PROJECT_TOKEN` | `UQDn1PLpvc6QVMkJdh9l5IEJDKL7_alFS89EPv7aPiaI0pTV` | planned (deployed by campaign activation) |

### Configuration (per dry-run)

| Parameter | Value |
| --- | --- |
| Project Owner | `UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq` |
| Team Wallet | `UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq` |
| Platform Fund | `UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq` |
| targetRaiseTon | 50 TON |
| hardCapTon | 50 TON |
| minContributionTon | 1 TON |
| minParticipants | 5 |
| minTotalRaiseTon | 5 TON |
| endTime | ~7 days from deployment |
| platformFeeBps | 350 (3.5%) |

### Tx Hashes

- Not captured (deployment not executed).

## Pre-Deployment Verification

| Check | Result |
| --- | --- |
| `npm run build:all` | PASSED |
| `npm run typecheck` | PASSED |
| `npm test -- --runInBand` | PASSED, 16 suites, 104 tests |
| `npm run deploy:simple-launch:testnet:plan` | PASSED (dry-run, addresses predicted) |
| `npm run verify:simple-launch:testnet` | PENDING (all 5 items pending — not deployed, RPC 504) |
| `npm run test:simple-launch:flow:plan` | PASSED (dry-run, both success and failure scenarios) |

## RPC Status

```
testnet.toncenter.com → Cloudflare 504 Gateway Timeout
retry_after: 120 seconds
error: origin_gateway_timeout
```

All `verify:get-methods` and `verify:vc-v3:testnet` attempts fail with the same 504 error.
This is a TonCenter origin-side issue, not a contract code problem.

## Flow Results — ALL PENDING

Flow execution requires:
1. Real testnet deployment (blocked by RPC)
2. Sufficient testnet TON in contributor wallets
3. `SIMPLE_LAUNCH_CONTRIBUTOR_MNEMONICS` env var configured

| Flow Item | Status |
| --- | --- |
| 5 users activation | PENDING (RPC) |
| Under-target distribution | PENDING (RPC) |
| Full-target distribution | PENDING (RPC) |
| Token deployment | PENDING (RPC) |
| User claim | PENDING (RPC) |
| Project withdraw | PENDING (RPC) |
| Platform fee withdraw | PENDING (RPC) |
| Failed campaign refund | PENDING (RPC) |
| Duplicate claim/reject | PENDING (RPC) |
| hardCap rejection | PENDING (RPC) |

## Execution Commands (when RPC recovers)

```bash
# Deploy
CONFIRM_SIMPLE_LAUNCH_TESTNET_DEPLOY=YES npm run deploy:simple-launch:testnet

# Verify
npm run verify:simple-launch:testnet

# Run flow (success scenario)
CONFIRM_SIMPLE_LAUNCH_TESTNET_FLOW=YES SIMPLE_LAUNCH_FLOW_SCENARIO=success npm run test:simple-launch:flow

# Run flow (failure scenario)
CONFIRM_SIMPLE_LAUNCH_TESTNET_FLOW=YES SIMPLE_LAUNCH_FLOW_SCENARIO=failure npm run test:simple-launch:flow
```

## Required Env Vars (not committed)

| Var | Purpose |
| --- | --- |
| `DEPLOYER_MNEMONIC` | Deploy contract |
| `TONCENTER_API_KEY` | RPC access |
| `SIMPLE_LAUNCH_CONTRIBUTOR_MNEMONICS` | Pipe-separated contributor mnemonics for flow test |
| `SIMPLE_LAUNCH_FLOW_CONTRIBUTION_TON` | Contribution amount (default: 10) |
| `SIMPLE_LAUNCH_FLOW_WITHDRAW_TON` | Withdraw amount (default: hardCapTon) |
| `TON_NETWORK=testnet` | Must be testnet |

## Boundaries

| Item | Status |
| --- | --- |
| mainnet deployed | NO |
| D1 SQL executed | NO |
| Worker/frontend/vc touched | NO |
| secrets committed | NO |
| tx hashes fabricated | NO |
| RPC failure hidden | NO (explicitly recorded) |
| verification fabricated | NO (all marked PENDING) |

## D1 SQL Plan

See `worker/sql/simple-launch-v1-testnet-plan.sql`. PLAN ONLY. Not executed.

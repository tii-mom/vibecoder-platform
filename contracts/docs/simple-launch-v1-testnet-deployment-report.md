# SimpleLaunch v1 Testnet Deployment Report

> Status: DEPLOYED. Success and failure/refund flows completed on testnet.

## Deployment

| Item | Value |
| --- | --- |
| **Network** | testnet |
| **Executed** | YES |
| **Manifest** | `contracts/deployments/testnet.simple-launch.json` |
| **Status** | deployed |
| **Generated at** | `2026-06-04T02:52:49.692Z` |
| **Deployer** | `UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq` |

### Contract Addresses

| Contract | Address | Status |
| --- | --- | --- |
| `SIMPLE_LAUNCH_CAMPAIGN` | `UQB2khuJechrKt9P2xADTWJVY7iQQF8GXOeHNbtLADdZjgxC` | deployed |
| `LAUNCH_ESCROW` | `UQAbBqEAuArxhgvAja3dP3tF5CsJ6s3NyMtWRV6unkjEd24h` | deployed |
| `PROJECT_TOKEN` | `UQBdnCJ4s-NtEocbEf7dfJ85j7kLB66XevQtsF1WyjkwLClz` | deployed by activation |

### Configuration

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
| endTime | `1781146323` |
| platformFeeBps | 350 (3.5%) |

### Tx Hashes

- Not captured by deployment script.

## Pre-Deployment Verification

| Check | Result |
| --- | --- |
| `npm run build:all` | PASSED |
| `npm run typecheck` | PASSED |
| `npm test -- --runInBand` | PASSED, 16 suites, 104 tests |
| `npm run deploy:simple-launch:testnet:plan` | PASSED (dry-run, addresses predicted) |
| `CONFIRM_SIMPLE_LAUNCH_TESTNET_DEPLOY=YES npm run deploy:simple-launch:testnet` | PASSED |
| `npm run verify:simple-launch:testnet` | PASSED for campaign, escrow, and ProjectToken |
| `npm run test:simple-launch:flow:plan` | PASSED (dry-run, both success and failure scenarios) |
| `CONFIRM_SIMPLE_LAUNCH_TESTNET_FLOW=YES SIMPLE_LAUNCH_FLOW_SCENARIO=success npm run test:simple-launch:flow` | PASSED |
| `SIMPLE_LAUNCH_MANIFEST_PATH=deployments/testnet.simple-launch.failure-refund.json CONFIRM_SIMPLE_LAUNCH_TESTNET_FLOW=YES SIMPLE_LAUNCH_FLOW_SCENARIO=failure npm run test:simple-launch:flow` | PASSED |

## RPC Status

RPC recovered enough for platform get-method verification, SimpleLaunch deployment, SimpleLaunch campaign/escrow verification, success flow execution, failure/refund flow execution, and ProjectToken verification.

Current blocker is not RPC. SimpleLaunch success and failure/refund paths have both been exercised on testnet.

## Flow Results

Failure/refund scenario evidence uses a separate deployed campaign because the primary campaign completed the success path.

| Failure/refund evidence | Value |
| --- | --- |
| Manifest | `contracts/deployments/testnet.simple-launch.failure-refund.json` |
| Campaign | `UQBdv8E56bNidIbHhZQCzXwKVrX6oeGps1f-6cgyNNg_rM7k` |
| Escrow | `UQD-PcDNkXuIUwNbtxNBzAYi13spYpkzkBx3xME9VlfOcbTC` |
| Temporary contributor | `UQBHOtv4Y6N1ZDJ3pJwqPA2xOh2UasQ5_kAeijfBx84b5DQ_` |
| Campaign failed state | COMPLETE — state=4 |
| Escrow failed state | COMPLETE — state=3 |
| Refund | COMPLETE |
| Duplicate refund | REJECTED — refunded flag stayed 1 |
| Claim after failure | REJECTED — campaign stayed failed |

| Flow Item | Status |
| --- | --- |
| 5 users activation | COMPLETE |
| Under-target distribution | COMPLETE — failure/refund scenario |
| Full-target distribution | COMPLETE |
| Token deployment | COMPLETE |
| User claim | COMPLETE |
| Project withdraw | COMPLETE |
| Platform fee withdraw | N/A in SimpleLaunch v1 — no separate platform-fee withdraw op; escrow withdraw is project-owner withdrawal |
| Failed campaign refund | COMPLETE |
| Duplicate refund reject | COMPLETE |
| Claim after failure reject | COMPLETE |
| hardCap rejection | Covered by sandbox tests; not repeated on testnet |

## Remaining Execution Commands

```bash
# Re-run flow plans
npm run test:simple-launch:flow:plan
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
| flow blocker hidden | NO |
| verification fabricated | NO |

## D1 SQL Plan

See `worker/sql/simple-launch-v1-testnet-plan.sql`. PLAN ONLY. Not executed.

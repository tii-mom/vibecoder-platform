# SimpleLaunch v1 Testnet Deployment Report

> Status: DEPLOYED. Success flow completed on testnet. Failure/refund scenario still requires a separate deployed campaign or explicit waiver.

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

## RPC Status

RPC recovered enough for platform get-method verification, SimpleLaunch deployment, SimpleLaunch campaign/escrow verification, success flow execution, and ProjectToken verification.

Current blocker is not RPC. The remaining SimpleLaunch flow gap is the failure/refund scenario, which requires a separate deployed campaign because the current campaign has completed the success path.

## Flow Results

Flow execution requires:
1. Failure/refund scenario execution on a separate deployed campaign, or explicit waiver.

| Flow Item | Status |
| --- | --- |
| 5 users activation | COMPLETE |
| Under-target distribution | PENDING — separate scenario |
| Full-target distribution | COMPLETE |
| Token deployment | COMPLETE |
| User claim | COMPLETE |
| Project withdraw | COMPLETE |
| Platform fee withdraw | PENDING |
| Failed campaign refund | PENDING — requires separate campaign |
| Duplicate claim/reject | PENDING |
| hardCap rejection | PENDING |

## Remaining Execution Commands

```bash
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
| flow blocker hidden | NO (failure/refund scenario remains pending) |
| verification fabricated | NO |

## D1 SQL Plan

See `worker/sql/simple-launch-v1-testnet-plan.sql`. PLAN ONLY. Not executed.

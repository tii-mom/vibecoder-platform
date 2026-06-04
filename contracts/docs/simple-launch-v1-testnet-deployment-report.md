# SimpleLaunch v1 Testnet Deployment Report

> Status: DEPLOYED. Campaign and escrow get-method verification passed. Success/failure flow is blocked until contributor wallets are configured and funded.

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
| `PROJECT_TOKEN` | `UQBdnCJ4s-NtEocbEf7dfJ85j7kLB66XevQtsF1WyjkwLClz` | pending activation |

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
| `npm run verify:simple-launch:testnet` | PASSED for campaign and escrow; ProjectToken pending activation |
| `npm run test:simple-launch:flow:plan` | PASSED (dry-run, both success and failure scenarios) |

## RPC Status

RPC recovered enough for platform get-method verification, SimpleLaunch deployment, and SimpleLaunch campaign/escrow verification.

Current blocker is not RPC. Flow execution is blocked by missing contributor wallets.

## Flow Results

Flow execution requires:
1. Sufficient testnet TON in 5 unique contributor wallets
2. `SIMPLE_LAUNCH_CONTRIBUTOR_MNEMONICS` env var configured
3. Success flow execution
4. Failure/refund scenario execution on a separate deployed campaign

| Flow Item | Status |
| --- | --- |
| 5 users activation | BLOCKED — contributor mnemonics not configured |
| Under-target distribution | PENDING |
| Full-target distribution | PENDING |
| Token deployment | PENDING — activation not complete |
| User claim | PENDING |
| Project withdraw | PENDING |
| Platform fee withdraw | PENDING |
| Failed campaign refund | PENDING — requires separate campaign |
| Duplicate claim/reject | PENDING |
| hardCap rejection | PENDING |

## Remaining Execution Commands

```bash
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
| flow blocker hidden | NO (contributor wallets required) |
| verification fabricated | NO |

## D1 SQL Plan

See `worker/sql/simple-launch-v1-testnet-plan.sql`. PLAN ONLY. Not executed.

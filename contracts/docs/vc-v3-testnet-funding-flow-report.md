# VC v3 Testnet Funding / Flow Evidence

> **Status:** Evidence report. Funding NOT executed. Flow tests dry-run only.

---

## Funding

| 项目 | 值 |
|------|-----|
| Executed | **NO** |
| Reason | Deployer VC balance (~30M VC) insufficient for 500M total need |
| SaleVesting self VC wallet | `UQANAqwlEmVLjKB4PfiIDo0HVLtuGmPOID-nbpW3SKd9IN2p` |
| SaleVesting VC balance | **0 VC** (needs 300M) |
| TeamVesting self VC wallet | `UQBFi75JuzGEboqywouPJKGRZSiRmKpVk0nxPTt0tNsmM7lO` |
| TeamVesting VC balance | **0 VC** (needs 200M) |
| Deployer VC balance | ~30,010,002 VC |
| Funding tx hashes | N/A |

**Required action:** Mint 500M+ VC from VC_JETTON admin, or transfer VC from Fund / VC_REWARD_POOL to deployer wallet.

---

## On-chain Verification

| 检查 | 结果 |
|------|------|
| build:all | ✓ |
| typecheck | ✓ |
| tests | 76 passed |
| verify:get-methods | 9/9 |
| verify:vc-v3:testnet | 10/10 OK |
| verify:vc-v3:balances | FAIL (0/0 — pre-funding) |

---

## Flow Tests

### Read-only (dry-run) — passed

| 项目 | 结果 |
|------|------|
| TeamVesting: Round 1 unlocked | ✓ |
| TeamVesting: claimable 20M VC | ✓ |
| TeamVesting: round 2 threshold | ✓ |
| TeamVesting: round 10 threshold | ✓ |
| SaleVesting: getSaleTier(1/2/3) | ✓ |
| SaleVesting: allocated=0 / price=0 | ✓ |

### Execute — pending

| 项目 | 状态 |
|------|------|
| TeamVesting Round 1 claim | **pending** (requires funding) |
| TeamVesting feed price → 5000 | **pending** (requires funding) |
| SaleVesting feed price → 78125 | **pending** (requires funding) |
| SaleVesting 99 TON buy/claim | **pending** (requires funding + buyer wallet) |

---

## Boundaries

| 项目 | 确认 |
|------|------|
| mainnet deployed | NO |
| D1 SQL executed | NO |
| Worker production touched | NO |
| frontend / vc touched | NO |
| secrets committed | NO |
| EarlySubscription / Strategic restored | NO |

---

## Next Steps

1. Mint/transfer >= 500M VC to deployer wallet
2. `CONFIRM_TESTNET_FUND=YES npm run fund:vc-v3:testnet`
3. `CONFIRM_TESTNET_FLOW_TEST=YES npm run test:vc-v3:flows`
4. Begin DeveloperRewardPool implementation

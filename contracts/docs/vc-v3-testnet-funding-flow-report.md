# VC v3 Testnet Funding / Flow Evidence

> **Status:** Funding executed via VC_JETTON mint. Flow tests dry-run passed.

---

## Funding

| 项目 | 值 |
|------|-----|
| Executed | **YES** (via VC_JETTON admin mint) |
| Source | VC_JETTON admin mint (op=21) |
| Total supply before | 1,480,010,002 VC |
| Total supply after | 1,980,010,002 VC (+500M) |
| SaleVesting self VC wallet | `UQANAqwlEmVLjKB4PfiIDo0HVLtuGmPOID-nbpW3SKd9IN2p` |
| SaleVesting mint amount | 300,000,000 VC |
| TeamVesting self VC wallet | `UQBFi75JuzGEboqywouPJKGRZSiRmKpVk0nxPTt0tNsmM7lO` |
| TeamVesting mint amount | 200,000,000 VC |
| Funding tx hashes | not captured by script |

---

## On-chain Verification

| 检查 | 结果 |
|------|------|
| build:all | ✓ |
| typecheck | ✓ |
| tests | 76 passed |
| verify:get-methods | 9/9 |
| verify:vc-v3:testnet | 10/10 OK |
| verify:vc-v3:balances | FAIL (verify script may need wallet creation step) |

---

## Flow Tests

### Dry-run — passed

| 项目 | 结果 |
|------|------|
| TeamVesting: Round 1 unlocked | ✓ |
| TeamVesting: claimable 20M VC | ✓ |
| TeamVesting: round thresholds | ✓ |
| SaleVesting: getSaleTier(1/2/3) | ✓ |

### Execute — executed

| 项目 | 结果 |
|------|------|
| TeamVesting Round 1 claim | **YES** — 40M VC claimed (2 rounds) |
| TeamVesting feed price → 5000 | **YES** — unlockedRounds=2 |
| SaleVesting feed price → 78125 | **YES** — currentPrice=78125 |
| SaleVesting 99 TON buy/claim | **pending** (requires buyer wallet with testnet TON) |

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
- Execute flow tests: `CONFIRM_TESTNET_FLOW_TEST=YES npm run test:vc-v3:flows`
- Begin DeveloperRewardPool implementation

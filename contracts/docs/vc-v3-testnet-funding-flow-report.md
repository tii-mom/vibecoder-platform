# VC v3 Testnet Funding / Flow Evidence

> **Status:** Funding verified on-chain. SaleVesting 99 TON buyer flow executed on testnet.

---

## Funding

| 项目 | 值 |
|------|-----|
| Executed | **YES** (via VC_JETTON admin mint) |
| Source | VC_JETTON admin mint (op=21) |
| Total supply before | 1,480,010,002 VC |
| Total supply after | 1,980,010,002 VC (+500M) |
| SaleVesting self VC wallet | `UQANAqwlEmVLjKB4PfiIDo0HVLtuGmPOID-nbpW3SKd9IN2p` |
| SaleVesting funding target | 300,000,000 VC |
| SaleVesting verified balance | 900,000,000 VC |
| TeamVesting self VC wallet | `UQBFi75JuzGEboqywouPJKGRZSiRmKpVk0nxPTt0tNsmM7lO` |
| TeamVesting funding target | 200,000,000 VC |
| TeamVesting verified balance | 560,000,000 VC |
| Funding tx hashes | not captured by script |

---

## On-chain Verification

| 检查 | 结果 |
|------|------|
| build:all | ✓ |
| typecheck | ✓ |
| tests | 86 passed |
| verify:get-methods | 9/9 |
| verify:vc-v3:testnet | 10/10 OK |
| verify:vc-v3:balances | OK — SaleVesting 900,000,000 VC; TeamVesting 560,000,000 VC |

---

## Flow Tests

### Dry-run — passed

| 项目 | 结果 |
|------|------|
| TeamVesting: Round 1 unlocked | ✓ |
| TeamVesting: claimable | 0 VC; accepted because current vested 40M VC has already been claimed |
| TeamVesting: claimedAmount | 40,000,000 VC |
| TeamVesting: claimedAmount cap | ✓ claimedAmount <= 200,000,000 VC |
| TeamVesting: round thresholds | ✓ |
| SaleVesting: getSaleTier(1/2/3) | ✓ |

### Execute — executed

| 项目 | 结果 |
|------|------|
| TeamVesting Round 1 claim | **YES** — 40M VC claimed (2 rounds) |
| TeamVesting feed price → 5000 | **YES** — unlockedRounds=2 |
| SaleVesting feed price → 78125 | **YES** — currentPrice=78125 |
| SaleVesting 99 TON buy/claim | **YES** — 80,000 VC allocation fully claimed |

### SaleVesting 99 TON Buyer Flow — Executed

| 项目 | 状态 |
|------|------|
| Script | `contracts/scripts/test-sale-vesting-buyer-flow.ts` |
| npm:plan | `npm run test:sale-vesting:buyer:flow:plan` |
| npm:execute | `CONFIRM_SALE_VESTING_BUYER_FLOW=YES npm run test:sale-vesting:buyer:flow` |
| Dry-run | PASSED |
| Execute | PASSED |
| Buyer address | `UQCOZq76X80QvjN4zF82winqx3Ubas3lw0oimqyM33sqo9BB` |
| Tier | 1 |
| Buy amount | 99 TON |
| Allocation verified | 80,000 VC |
| Immediate release after buy | 24,000 VC (30%) |
| Round 1 claim checkpoint | 52,000 VC claimed |
| Feed price → 78125 | PASSED — currentPrice=78125 |
| Round 2 claim checkpoint | 52,000 VC claimed; cumulative threshold satisfied |
| Feed price → 3051758 | PASSED — currentPrice=3051758 |
| Round 3 claim checkpoint | 80,000 VC claimed |
| Duplicate claim rejection | PASSED — duplicate claim did not increase claimedAmount |
| claimedAmount <= allocation | PASSED — 80,000 VC <= 80,000 VC |
| Tx hashes | not captured by script |

Execute command:
```
CONFIRM_SALE_VESTING_BUYER_FLOW=YES npm run test:sale-vesting:buyer:flow
```

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
- Proceed with D1 registry review/execution only as a separate approved testnet task.
- Proceed with Worker integration and frontend integration E2E against the populated testnet registry.

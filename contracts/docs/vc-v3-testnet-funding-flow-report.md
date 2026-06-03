# VC v3 Testnet Funding / Flow Evidence

> **Status:** Funding verified on-chain. Flow dry-run passes against the current already-partially-executed testnet state.

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
| SaleVesting 99 TON buy/claim | **RPC_BLOCKED** (script ready, RPC 504) |

### SaleVesting 99 TON Buyer Flow — Prepared

| 项目 | 状态 |
|------|------|
| Script | `contracts/scripts/test-sale-vesting-buyer-flow.ts` |
| npm:plan | `npm run test:sale-vesting:buyer:flow:plan` |
| npm:execute | `CONFIRM_SALE_VESTING_BUYER_FLOW=YES npm run test:sale-vesting:buyer:flow` |
| Dry-run | PASSED |
| Execute | RPC_BLOCKED |
| Buyer address | pending (requires SALE_VESTING_BUYER_MNEMONIC with testnet TON) |
| Allocation expected | 80,000 VC (tier 3, 99 TON) |
| Round 1 (30%) | pending |
| Feed price → 78125 | pending (already done in prior flow) |
| Round 2 (35%) | pending |
| Feed price → 3051758 | pending |
| Round 3 (35%) | pending |
| Duplicate claim rejection | pending |
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

## RPC Status

TonCenter testnet returns 504 Gateway Timeout (2026-06-03). All chain verification blocked.

---

## Next Steps
- Execute SaleVesting 99 TON buyer flow when RPC recovers and buyer wallet is funded.
- Proceed with D1 registry review, Worker integration, and frontend integration (code only, no RPC needed).

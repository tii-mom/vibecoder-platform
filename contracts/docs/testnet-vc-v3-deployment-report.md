# VC v3 Testnet Deployment Report

> **Status:** Deployed — 2026-06-03

---

## 一、基本信息

| 项目 | 值 |
|------|-----|
| 部署时间 | 2026-06-03T13:14:55Z |
| 网络 | testnet |
| Deployer address | UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq |
| VC master | UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf |

---

## 二、SaleVesting

| 项目 | 值 |
|------|-----|
| Address | UQAV6noSRUR7C83RwCB3T4XV0ylVqCAs_Crf1N5aHp6KzScm |
| Bounceable | EQAV6noSRUR7C83RwCB3T4XV0ylVqCAs_Crf1N5aHp6KzScbV |
| Self VC wallet | UQANAqwlEmVLjKB4PfiIDo0HVLtuGmPOID-nbpW3SKd9IN2p |
| Admin | UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq |
| Treasury | UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq |
| Config | cap=300M VC, tiers A(3r)/B(5r)/C(10r) |
| Deploy tx hash | not captured by script |

---

## 三、TeamVesting

| 项目 | 值 |
|------|-----|
| Address | UQD24kG-Pnl2OyJAs2hYtbRnBVOkgtsdhhD6z14u46NfSkRF |
| Bounceable | EQD24kG-Pnl2OyJAs2hYtbRnBVOkgtsdhhD6z14u46NfSocK |
| Self VC wallet | UQBFi75JuzGEboqywouPJKGRZSiRmKpVk0nxPTt0tNsmM7lO |
| Admin | UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq |
| Beneficiary | UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq |
| Config | allocation=200M VC, 10 rounds x 20M |
| Deploy tx hash | not captured by script |

---

## 四、Get-Method 验证（全部通过）

| 方法 | 结果 |
|------|------|
| SALE_VESTING.getSaleVestingData | OK |
| SALE_VESTING.getSaleTier(1) | OK |
| SALE_VESTING.getSaleTier(2) | OK |
| SALE_VESTING.getSaleTier(3) | OK |
| SALE_VESTING.getSaleUnlockState | OK |
| TEAM_VESTING.getTeamVestingData | OK |
| TEAM_VESTING.getTeamVestingRound(1) | OK |
| TEAM_VESTING.getTeamVestingRound(2) | OK |
| TEAM_VESTING.getTeamVestingRound(10) | OK |
| TEAM_VESTING.getTeamClaimable | OK |

---

## 五、Deployment Artifacts

| 项目 | 状态 |
|------|------|
| Manifest updated | YES |
| Manifest file | deployments/testnet.vc-v3.json |
| D1 SQL executed | **NO** |
| D1 SQL plan | worker/sql/platform-contracts-v3-testnet-plan.sql |
| VC wallets funded | **NO** (pending) |

---

## 六、下一步

1. Fund SaleVesting self VC wallet with >= 300M VC
2. Fund TeamVesting self VC wallet with >= 200M VC
3. Run buy/claim/feed price flow tests
4. After manual review, execute D1 SQL plan
5. Continue remaining v3 contracts

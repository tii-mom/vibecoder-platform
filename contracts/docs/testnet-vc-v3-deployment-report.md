# VC v3 Testnet Deployment Report

> **Status:** Executed or Pending (updated after deploy).

---

## 一、基本信息

| 项目 | 值 |
|------|-----|
| 部署时间 | (fill after deploy) |
| 网络 | testnet |
| Deployer address | (fill after deploy) |
| VC master | UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf |

---

## 二、SaleVesting

| 项目 | 值 |
|------|-----|
| Address | (fill after deploy) |
| Bounceable | (fill after deploy) |
| Self VC wallet | (fill after deploy) |
| Admin | (fill after deploy) |
| Treasury | (fill after deploy) |
| Config | cap=300M VC, tiers A(3r)/B(5r)/C(10r) |
| Deploy tx hash | (fill after deploy) |

---

## 三、TeamVesting

| 项目 | 值 |
|------|-----|
| Address | (fill after deploy) |
| Bounceable | (fill after deploy) |
| Self VC wallet | (fill after deploy) |
| Admin | (fill after deploy) |
| Beneficiary | (fill after deploy) |
| Config | allocation=200M VC, 10 rounds x 20M |
| Deploy tx hash | (fill after deploy) |

---

## 四、Get-Method 验证

| 方法 | 结果 |
|------|------|
| SALE_VESTING.getSaleVestingData | (fill) |
| SALE_VESTING.getSaleTier(1) | (fill) |
| SALE_VESTING.getSaleTier(2) | (fill) |
| SALE_VESTING.getSaleTier(3) | (fill) |
| SALE_VESTING.getSaleUnlockState | (fill) |
| TEAM_VESTING.getTeamVestingData | (fill) |
| TEAM_VESTING.getTeamVestingRound(1) | (fill) |
| TEAM_VESTING.getTeamVestingRound(2) | (fill) |
| TEAM_VESTING.getTeamVestingRound(10) | (fill) |
| TEAM_VESTING.getTeamClaimable | (fill) |

---

## 五、Deployment Artifacts

| 项目 | 状态 |
|------|------|
| Manifest updated | (YES / NO) |
| Manifest file | deployments/testnet.vc-v3.json |
| D1 SQL executed | NO |
| D1 SQL plan | worker/sql/platform-contracts-v3-testnet-plan.sql |
| VC wallets funded | (NO / YES / pending) |

---

## 六、下一步

1. Fund SaleVesting self VC wallet with >= 300M VC.
2. Fund TeamVesting self VC wallet with >= 200M VC.
3. Run buy/claim/feed price flow tests.
4. After manual review, execute D1 SQL plan:
   - INSERT SALE_VESTING testnet address.
   - INSERT TEAM_VESTING testnet address.
5. Continue remaining v3 contracts:
   - DeveloperRewardPool
   - EcosystemRewardPool
   - DevelopmentFund
   - ReserveVault
6. VC_JETTON mainnet fixed supply strategy.

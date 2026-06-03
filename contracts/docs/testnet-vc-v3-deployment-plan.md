# VC v3 Testnet Deployment Plan

> **Status:** Preparation only. This PR does not deploy testnet or mainnet.

---

## 一、概况

本 PR 为 SaleVesting / TeamVesting 的测试网部署做准备。包含：
- Dry-run 脚本
- Get-method 验证扩展
- D1 SQL plan
- Manifest 模板

**不包含：**
- 真实链上交易
- 生产 D1 写入
- mainnet 配置

---

## 二、前置条件

部署前必须确认：

1. 6 个旧平台合约地址不变（VC_JETTON / FUND / VC_REWARD_POOL / EARLY_FUNDRAISING / LAUNCH_FEE / TOKEN_LAUNCHER）。
2. VC_JETTON 测试网 admin wallet 有足够 TON 用于 gas。
3. `.env` 中配置以下变量：

```env
VC_JETTON_ADDRESS=UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf
VC_TREASURY_ADDRESS=<treasury wallet>
VC_TEAM_BENEFICIARY_ADDRESS=<team beneficiary wallet>
VC_ADMIN_ADDRESS=<admin wallet>
DEPLOYER_MNEMONIC=<24 words>
TONCENTER_API_KEY=<key>
```

4. SaleVesting / TeamVesting 部署后需要向它们的 self VC wallet 转入 VC token 用于发放。

---

## 三、Dry-run

```bash
cd contracts
npm run deploy:vc-v3:testnet:plan
```

输出部署参数摘要（admin、treasury、beneficiary、vcMaster、cap 等），不发送交易。

---

## 四、执行部署（尚未实现）

当前 PR 只支持 dry-run。**Actual testnet deployment execution is not yet implemented.**

部署执行命令将在单独 PR 中添加，并需要人工审批后执行。
在 execute path 实现前，请勿尝试发送链上交易。

---

## 五、部署后 Get-Method 验证

```bash
npm run verify:vc-v3:testnet
```

验证：
- `SALE_VESTING.getSaleVestingData`
- `SALE_VESTING.getSaleTier(1/2/3)`
- `SALE_VESTING.getSaleUnlockState`
- `TEAM_VESTING.getTeamVestingData`
- `TEAM_VESTING.getTeamVestingRound(1/2/10)`
- `TEAM_VESTING.getTeamClaimable`

---

## 六、D1 更新

部署后，更新 `contracts/deployments/testnet.vc-v3.plan.json` 中的 v3 地址为实际值。
然后使用 `worker/sql/platform-contracts-v3-testnet-plan.sql` 中的 INSERT 语句更新 D1。
SQL 文件为 PLAN ONLY，不会自动执行。

---

## 七、ProjectToken mint cap 测试 Campaign

PR-C (#21) 修改了 LaunchCampaign / ProjectToken。

- 旧测试 Campaign 不会自动升级。
- 要验证 mint cap，必须新建一个测试 LaunchCampaign：
  1. 创建新 campaign。
  2. Spark 到 55% threshold。
  3. 触发 ProjectToken deploy。
  4. 确认初始 mint 成功。
  5. 确认 disable mint 已执行。
  6. owner 调用 mint 失败（exitCode 705）。
  7. owner 修改 metadata 成功。

---

## 八、回滚方式

1. 如果 SaleVesting / TeamVesting 部署出错，不更新 manifest 中的地址。
2. 如需回滚已部署合约，发送 admin withdraw VC → 转回 treasury，然后废弃该合约地址。
3. 不回滚 6 个旧平台合约地址。
4. D1 回滚：删除对应 contract_name='SALE_VESTING'/'TEAM_VESTING' 行。

---

## 九、已知限制

| 合约 | 状态 |
|------|------|
| DeveloperRewardPool | 未实现 |
| EcosystemRewardPool | 未实现 |
| DevelopmentFund | 未实现 |
| ReserveVault | 未实现 |
| Oracle | 未实现（v1 使用 admin feed price） |
| Governance | 暂不实现 |

---

## 十、下一阶段

1. 人工确认并执行测试网部署。
2. 部署后填充 manifest 地址。
3. 运行 v3 verify 脚本。
4. 创建测试 Campaign 验证 ProjectToken mint cap。
5. 转 VC 到 SaleVesting / TeamVesting self wallet。
6. 测试 buy / claim / feed price 流程。
7. 继续实现 DeveloperRewardPool / EcosystemRewardPool / DevelopmentFund / ReserveVault。

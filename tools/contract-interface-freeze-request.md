> [!WARNING]
> FROZEN: Historical request document. Use tools/contract-interface-freeze.md for the current frozen interface.
> Registry: [DOCS_FREEZE.md](../DOCS_FREEZE.md)

# 合约接口冻结请求清单

本文档向合约线程索取必须的信息。在合约接口冻结之前，本线程**不执行**基于未冻结接口的适配工作。

---

## ✅ 已确认：Testnet 部署状态（2026-06-02 verify:get-methods 全通过）

| 合约 | Testnet 地址 (non-bounceable) | get-method 验证 |
|------|-----|-----|
| VC_JETTON | `UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf` | ✅ get_jetton_data/get_wallet_address → total_supply=980.010002M VC |
| FUND | `UQADQbeXROSyyCBwE2qPuhr2cbE0hXgWhVCJawR9UVK9CH0Q` | ✅ getFundData, getFundStats, getFundUnlockState |
| VC_REWARD_POOL | `UQD6Zak3m1RdCA1OOIMFSh3fF6VrsgBIwxLcpn1o76YUiVZN` | ✅ getRewardPoolData |
| EARLY_FUNDRAISING | `UQBXX3nt12ZKmeY9ITF6G_YC4eh3JCspxnOCX762sBDWdqDD` | ✅ getFundraisingData |
| LAUNCH_FEE | `UQBs3qGxQ5KMPLM1aQfolsc6uoLfHaFtZ3XT0ZtNN9hXuzW-` | ✅ getLaunchFeeData |
| TOKEN_LAUNCHER | `UQAYzEOHPZgHeS9gmJxGBUFJrvkn2JnBCv4uD2OmkK_FeSXs` | ✅ getLauncherData |
| STRATEGIC | 未在 manifest 中 | ⚠️ 待部署/确认 |

### 已记录余额（来自 deployment manifest）

```
FUND              250,000,000 VC
VC_REWARD_POOL    450,000,000 VC
EARLY_FUNDRAISING 100,000,000 VC
LIQUIDITY          50,000,000 VC (钱包地址: 0QDsx-vPapMJyIh3LYEQXAF_wp0iAWk8I6ZN7Vw79zqTDIjo)
EARLY_OPS          30,010,002 VC (钱包地址: 0QCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQU_g，含 10,002 VC Tonkeeper 展示验证)
```

### 权限状态

- 当前 testnet `VC_JETTON` **未撤销 admin**：`adminRevoked=false`。
- 当前 testnet `VC_JETTON` `mintable=-1`，admin 为 `UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq`。
- 这只用于 testnet 验证；主网前必须单独确认是否 revoke admin。
- 如主网策略要求弃权，门禁使用 `EXPECT_VC_ADMIN_REVOKED=1 npm run verify:vc-jetton`。

---

## 一、合约清单与职责

请确认以下合约列表及其职责：

| 合约 | 职责 | 主网地址 | 接口是否已冻结 |
|------|------|---------|--------------|
| LaunchCampaign | Spark/Launch 项目融资 | ? | 待确认 |
| ProjectToken | 项目代币 (Jetton) | ? | 待确认 |
| LaunchFee | 平台费用收取 | ? | 待确认 |
| Fund | 国库/资金池管理 | ? | 待确认 |
| EarlyFundraising | 早期募资/价格解锁 | testnet 已部署 | 已冻结 testnet |
| Governance? | 治理投票 | ? | 待确认 |
| Vesting? | 代币解锁 | ? | 待确认 |

**补充**：如果合约列表不完整或有新增/移除，请告知。

---

## ⚠️ 非合约侧发现的待确认项（本线程已修复 3 项）

### 1. BountyPage VC 识别（✅ 已修复）
- **问题**: BountyPage 只识别旧版 VC jetton 地址，不识别新 `VC_JETTON`
- **修复**: `vc/src/pages/BountyPage.tsx` — 添加了新 VC_JETTON 的 3 种地址格式

### 2. BountyPage TON API URL 硬编码（✅ 已修复）
- **问题**: 硬编码 `testnet.tonapi.io`
- **修复**: 使用 `VITE_TON_NETWORK` 环境变量动态选择

### 3. BountyPage LAUNCH_FEE fallback 地址过期（✅ 已修复）
- **问题**: fallback 是旧测试网地址
- **修复**: 更新为当前 testnet LAUNCH_FEE 地址

### 4. D1 Schema 命名不一致（✅ 已修复）
- **问题**: `0001_schema.sql` 中 `EARLY_SUB` vs 合约名 `EARLY_FUNDRAISING`
- **修复**: schema 注释已统一为 `EARLY_FUNDRAISING`

### 5. TokenLauncher 缺少 wrapper 和测试（✅ 已修复）
- **修复**: 已补 `contracts/wrappers/TokenLauncher.ts` 和 `contracts/tests/platform/TokenLauncher.spec.ts`

### 6. STRATEGIC 合约未部署（✅ 已移除）
- **结论**: `Strategic` 已由 `Fund`/`VCRewardPool` 分工替换，并从 Acton build/wrappers/scripts/tests 中移除

---

## 二、每个合约的 get-method 列表

以下信息 **必须等到接口冻结后** 才能适配，当前不可抢跑。

### LaunchCampaign

| 方法名 | 参数 | 返回类型 | 说明 |
|--------|------|---------|------|
| `get_launch_info` | ? | ? | 获取项目基本信息 |
| `get_raised_amount` | ? | ? | 已募集金额 |
| `get_milestone_status` | ? | ? | 里程碑状态 |
| `get_backer_info` | ? | ? | 单个支持者信息 |
| `get_spark_record` | ? | ? | Spark 记录 |
| ... | | | 请补全 |

### ProjectToken (Jetton)

| 方法名 | 参数 | 返回类型 | 说明 |
|--------|------|---------|------|
| `get_wallet_address` | owner_addr | address | 获取用户 jetton wallet 地址 |
| `get_jetton_data` | - | (supply, admin, ...) | 代币元数据 |
| ... | | | 请补全 |

### 其他合约

请为每个合约提供完整的 get-method 表。格式同上。

---

## 三、入站消息 (op code + body schema)

### LaunchCampaign

| op code | 用途 | body schema | 说明 |
|---------|------|------------|------|
| `0x???` | Spark (投入) | ? | 前端/Worker 构造 |
| `0x???` | 提交里程碑 | ? | 项目方操作 |
| `0x???` | 确认里程碑 | ? | 多签/管理员操作 |
| `0x???` | 退款 | ? | 支持者操作 |
| ... | | | 请补全 |

### ProjectToken (Jetton transfer notification)

| 场景 | body schema | 说明 |
|------|------------|------|
| Jetton transfer 通知 | `op=0x7362d09c query_id amount source destination ...` | 前端/Worker 需要解析 |
| Jetton burn 通知 | ? | |
| ... | | 请补全 |

### Fund

| op code | 用途 | body schema |
|---------|------|------------|
| ? | 存入 VC | ? |
| ? | 提取 VC | ? |
| ... | | 请补全 |

---

## 四、地址推导方式

请明确说明以下地址如何计算：

| 地址 | 推导方式 | 是否已冻结 |
|------|---------|-----------|
| 平台主钱包 | ? | 待确认 |
| LaunchCampaign 合约地址 | ? | 待确认 |
| ProjectToken 合约地址 | ? | 待确认 |
| User jetton wallet 地址 | 通过 Jetton master + user address 计算 | 待确认 |
| Fund 合约地址 | ? | 待确认 |

---

## 五、Worker 需要写入 D1 的合约地址

Worker 在以下场景需要将合约地址持久化到 D1：

| 场景 | 写入表 | 字段 | 来源 |
|------|--------|------|------|
| 创建 Launch | `launches` | `contract_address` | 合约返回 |
| 部署 Token | `tokens` | `token_contract_address` | 合约返回 |
| 平台初始化 | `platform_contracts` | `contract_name, address` | 部署脚本 |
| ... | | | 请补全 |

---

## 六、前端需要构造的钱包交易参数

以下操作需要前端通过 TonConnect 构造交易并发送：

| 操作 | 页面 | 合约 | op | 所需参数 |
|------|------|------|-----|---------|
| Spark 投入 | FeedPage / LaunchDetail | LaunchCampaign | ? | amount, launch_id, ... |
| VC Staking | BountyPage | LaunchFee | ? | amount, tier, ... |
| 提取 VC | FundPage | Fund | ? | amount, ... |
| 认领 VC | BountyPage | ? | ? | submission_id, ... |
| ... | | | | 请补全 |

**必须提供的参数结构**（以 Spark 投入为例）：

```typescript
// 确认这是否是最终 body schema
const body = beginCell()
  .storeUint(OP_SPARK, 32)     // op code — 待确认
  .storeUint(queryId, 64)
  .storeCoins(toNano(amount))
  .storeAddress(Address.parse(launchAddress))  // 目标 launch 合约地址 — 待确认
  // ... 其他字段
  .endCell();
```

---

## 七、Signer 是否需要变更

| 检查项 | 当前状态 | 是否需要变更 |
|--------|---------|-------------|
| 签名方式 (V4 wallet) | `WalletContractV4` | 待确认 |
| Payload body schema | `"VibeCoder Stars Paymaster"` 文本 | 待确认 |
| 目标地址推导 | 直接从 D1 读取 `owner_id` | 待确认 |
| Amount 格式 | `nanoTON (BigInt)` | 已确认，不应变 |
| Seqno 获取 | `contract.getSeqno()` | 已确认，不应变 |

---

## 八、退款/回滚/里程碑状态语义

| 状态 | 当前 Worker 语义 | 合约语义 | 是否一致 |
|------|-----------------|---------|---------|
| `PENDING` | 待 AI 审核 | ? | 待确认 |
| `AI_REVIEW_PASSED` | AI 通过，进入挑战期 | ? | 待确认 |
| `CHALLENGED` | 被挑战，进入仲裁 | ? | 待确认 |
| `COMPLETED` | 完成，资金释放 | ? | 待确认 |
| `REFUNDED` | 已退款 | ? | 待确认 |
| `FAILED` | 失败 | ? | 待确认 |

请确认 Worker 的 D1 状态字段与合约链上状态一一对应。

---

## 九、已冻结 vs 待确认 vs 不可抢跑

### 已冻结（可以开始适配）

| 接口 | 冻结日期 | 备注 |
|------|---------|------|
| *(待合约线程填写)* | | |

### 待确认（当前暂停适配）

| 接口 | 原因 |
|------|------|
| 所有合约 get-method | 合约可能变更 |
| 所有入站 op code | 合约可能变更 |
| Jetton notification body | 合约可能变更 |
| 合约地址推导 | 合约可能变更 |
| Worker ← 合约适配 | 依赖以上所有 |

### 不可抢跑（合约接口冻结前禁止执行）

- Worker 合约地址适配
- Worker op code / message body / get-method 解析适配
- 前端钱包交易参数适配
- Signer 链上 payload 结构适配
- D1 写入主网合约地址
- 链上 get-method 验证脚本
- Spark/Launch/Fund/EarlyFundraising 真实链路 E2E
- 任何依赖最终 ABI 的代码变更

---

## 十、非合约适配入口

本线程已完成且不依赖合约接口的工作：

| 工作项 | 状态 |
|--------|------|
| 静态门禁 (typecheck/lint/build) | ✅ |
| i18n/mock 边界扫描 | ✅ |
| Signer smoke (不签名/不广播) | ✅ |
| Stars 幂等静态检查 + live smoke | ✅ |
| E2E 骨架 (Playwright 浏览器测试) | ✅ |
| 生产配置检查脚本 | ✅ |
| 前端包体优化 (index 50KB) | ✅ |
| BountyPage VC 识别 + 网络自适应 | ✅ |
| get-method 验证 (全部 8 个通过) | ✅ |
| 合约接口冻结清单 (本文档) | ✅ |

合约接口冻结后，可基于以上预置工作快速完成适配。

---

## 2026-06-02 审计发现汇总

| # | 发现 | 位置 | 状态 |
|---|------|------|------|
| 1 | BountyPage 不识别新 VC_JETTON 地址 | `vc/src/pages/BountyPage.tsx:283-287` | ✅ 已修复 |
| 2 | BountyPage 硬编码 testnet.tonapi.io | `vc/src/pages/BountyPage.tsx:278` | ✅ 已修复 |
| 3 | BountyPage LAUNCH_FEE fallback 过期 | `vc/src/pages/BountyPage.tsx:276` | ✅ 已修复 |
| 4 | D1 schema EARLY_SUB vs 合约名不一致 | `worker/migrations/0001_schema.sql:45` | ✅ 已修复 |
| 5 | TokenLauncher 缺 wrapper + platform test | `contracts/wrappers/`, `contracts/tests/platform/` | ✅ 已修复 |
| 6 | STRATEGIC 未部署到 testnet | deploy manifest | ✅ 已移除 |
| 7 | 旧 VC jettons 与新版混存于 testnet | TON API 查询 | ℹ️ 已记录 |

---

*最后更新：2026-06-02*
*状态：等待合约线程提供接口冻结信息*

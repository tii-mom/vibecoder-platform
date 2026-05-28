# VibeCoder 合约体系设计 v3.0

> 基于 TON 链，使用 Tolk/Acton 语言。
> 对齐 VIBECODER_PLAN.md v2.0。

---

## 一、合约全景

```
用户用 TON 参与 Launch 某个项目的 Spark
        │
        ▼
┌──────────────────────────────────────────────────┐
│ ① Launch Campaign（每个项目部署一个实例）          │
│   - 三段式定价（Stage 1/2/3，不同兑换率）          │
│   - 55% 阈值 → 部署代币 + 分配 + 释放 30%        │
│   - 30/50/20 资金分账                            │
│   - 平方根投票治理                                │
│   - 退出机制（30-90 天窗口）                       │
│   - 未达 55% → 全额退款                           │
└──────────────┬───────────────────────────────────┘
               │
         55% 达成时自动:
               │
    ┌──────────┴────────────────────┐
    │                               │
    ▼                               ▼
┌──────────────┐          ┌──────────────────┐
│ ② LP Pool    │          │ ③ Token Launcher │
│   20% 资金    │          │   部署标准 TEP-74  │
│   + 等值代币  │          │   按 Stage 分配代币│
│   永久 DEX LP │          └────────┬─────────┘
└──────────────┘                    │
                           部署代币后:
                                    │
                                    ▼
                          ┌──────────────────┐
                          │ ④ Project Token  │
                          │   标准 TEP-74     │
                          │   无内嵌解锁逻辑   │
                          │   DEX/钱包兼容    │
                          └────────┬─────────┘
                                    │
                           Vesting 独立管理:
                                    │
                                    ▼
                          ┌──────────────────┐
                          │ ⑤ Vesting       │
                          │   独立锁仓合约    │
                          │   里程碑解锁      │
                          │   Oracle 喂价     │
                          └──────────────────┘
```

---

## 二、5 个合约详解

### 合约 1：Launch Campaign（每个项目一个）

**状态机**：

```
DRAFT → FUNDING → SUCCESS（≥55%）→ LIVE → COMPLETED
              → FAILED（<55% + 超时）→ REFUNDING → CLOSED
```

**存储**：

```
owner               项目方 TON 地址
targetTotal         目标总金额（TON）
deadline            截止时间
totalRaised         已募集

// 三段式定价
stage1Target        早鸟阶段目标
stage1Rate          兑换率（如 100 代币/TON）
stage1Bonus         额外奖励 %（如 10%）
stage2Target        中段阶段目标
stage2Rate
stage3Rate

// 55% 阈值
deployThreshold     55% × targetTotal
tokenDeployed       代币是否已部署

// 资金分账
teamShare           30（%）
governanceShare     50（%）
lpShare             20（%）

// 投资者记录
investors           map(address => { amount, stage, tokens })
totalSqrtWeight     总平方根投票权重

// 治理
withdrawalProposals map(id => { amount, purpose, yesVotes, noVotes, status })
exitRequests        map(address => { amount, status, redeemedAt })

// LP 池
lpPoolAddress       部署的 LP 合约地址
lpLockEnd           锁仓截止时间（12 个月后）
```

**核心方法**：

```
spark(amount, stage)
  → 当前阶段未满 → 计算代币数量 + 奖励
  → 记录投资人 + 更新总额
  → 若 totalRaised >= deployThreshold && !tokenDeployed:
      → 自动触发 deployToken()
      → 释放 30% 到团队钱包
      → 部署 LP 池（20%）
      → 锁定 50% 到治理合约
  → 若 deadline 已到 && totalRaised < deployThreshold:
      → 进入 REFUNDING 状态

deployToken()
  → 调用 Token Launcher 部署 TEP-74
  → 按各阶段分配代币到参与者钱包
  → tokenDeployed = true

submitWithdrawal(amount, purpose)
  → 仅项目方
  → 创建投票提案
  → 72 小时投票窗口

vote(proposalId, approve)
  → 任何代币持有人
  → 权重 = sqrt(持仓量)
  → 投票率 ≥ 15% && 同意 > 50% → 释放
  → 被拒 → 15 天后可重提
  → 连续 3 次被拒 → 平台介入

exitRequest()
  → 仅 30-90 天窗口内
  → 触发条件：14 天无更新 / 代币 < 发行价 50% / 连续 2 次投票未通过
  → 赎回金额 = 投资额 × 70% × (剩余资金 ÷ 初始 50%)
  → 销毁代币
  → TON 退还给用户

refund()
  → 仅 FAILED 状态
  → 按投资额全额退款

releaseLP()
  → 12 个月后 + 代币价格 ≥ 发行价 200%
  → LP 本金解锁
  → 50% 退团队 / 50% 进治理合约
```

### 合约 2：LP Pool

```
// Launch Campaign 成功时自动部署

资产：
  - 20% 募集资金（TON）
  - 等值项目代币

行为：
  - 在 DEX（STON.fi / DeDust）部署永久 LP
  - 12 个月锁仓
  - 手续费每月分配：50% LP / 30% 团队 / 20% 平台
  - 12 个月后若代币 ≥ 发行价 200% → 解锁本金
```

### 合约 3：Token Launcher（全局一个）

```
launch(tokenName, symbol, totalSupply, investors, campaignAddress):
  → 部署标准 TEP-74 Jetton
  → 按 investors 列表 mint 代币到各自钱包
  → 8% mint 到 Vault（预留）
  → 返回 tokenAddress

仅 Launch Campaign 合约可调用。
```

### 合约 4：Project Token（每个项目一个）

```
纯标准 TEP-74 Jetton。
不内嵌任何锁仓或解锁逻辑。
确保 Tonkeeper、STON.fi、DeDust 100% 兼容。
```

### 合约 5：Vesting Contract（每个项目一个）

```
// 管理项目方团队代币的锁仓释放

storage:
  token              代币合约地址
  beneficiary        项目方钱包
  milestones         [{ unlockAt, amount, unlocked }]
  oracleAddresses    喂价地址列表
  priceThresholds    每轮解锁价格

feedPrice(price):
  → 检查当前里程碑
  → 若 ≥ 5 个 oracle 均价达标 → 释放当前轮代币到团队钱包

// 不使用 15 人复杂喂价。Oracle 由平台管理或第三方（RedStone）提供。
```

---

## 三、关键数值一览

| 参数 | 值 | 说明 |
|------|-----|------|
| 代币部署阈值 | 55% | 达成后立即部署代币 |
| 团队即时资金 | 30% | 无需投票 |
| 治理锁定资金 | 50% | 需投票或代币 ≥ 150% |
| LP 池资金 | 20% | 永久流动性，12 月锁仓 |
| 退出窗口 | 30–90 天 | Launch 成功后 |
| 退出最大赎回比例 | 70% | 基于剩余治理资金 |
| 投票权重 | sqrt(持仓量) | 防鲸鱼 |
| 投票率门槛 | 15% | 至少 15% 总权重参与 |
| 同意门槛 | >50% | 通过 |
| 投票窗口 | 72 小时 | — |
| 被拒重试冷却 | 15 天 | — |
| LP 锁仓 | 12 个月 | — |
| LP 解锁条件 | 代币 ≥ 200% | — |
| LP 手续费分配 | 50/30/20 | LP/团队/平台 |
| 价格来源 | TWAP（DEX）+ Oracle 备用 | 双源 |

---

## 四、推荐目录结构

```
src/contracts/
├── launch_campaign.tolk    合约 1
├── lp_pool.tolk            合约 2
├── token_launcher.tolk     合约 3
├── project_token.tolk      合约 4（标准 TEP-74）
├── vesting.tolk            合约 5
└── tests/
    ├── launch_campaign.spec.ts
    └── token_launcher.spec.ts
```

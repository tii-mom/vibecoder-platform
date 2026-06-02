# VibeCoder 合约全景文档 v2.0（最终版）

> 合约唯一事实来源。已对齐全部用户决策。

---

## 一、最终分配模型

### TON 流向（募资 100%）

| 比例 | 去向 | 释放方式 |
|------|------|----------|
| 30% | 团队钱包 | 55% 触发后立即 |
| 50% | 治理合约 | 团队申请，持币人 sqrt 投票 |
| 18% | 项目方 | 自行支配（建池子、运营等） |
| 2% | 平台 Fund | 平台费 |

### Token 流向（总供应 100%）

| 比例 | 去向 | 释放方式 |
|------|------|----------|
| 35% | 投资者 | TGE 立即 |
| 40% | 团队 Vesting | 2% TGE + 38% 分 10 轮价格解锁 |
| 10% | 运营合约 | 项目方可随时调用（社区奖励等） |
| 10% | 平台 Fund | TGE 转入 |
| 5% | 项目方 | 和 18% TON 一起建 LP 池 |

---

## 二、合约清单（共 11 个）

### 平台代币系统（5 个，`platform/token-system/`）

| # | 合约 | 职责 | 行数 |
|---|------|------|------|
| P1 | VC Jetton | 发行 900M，发完废弃 | 160 |
| P2 | Fund | 持有 720M VC + 收 10% 代币 + 2% TON 费 | 210 |
| P3 | Strategic | 72M 战略储备 | 100 |
| P4 | Early Subscription | 45M TON 认购 | 170 |
| P5 | Launch Fee | 500 VC 质押 + 300 VC 部署费 | 200 |

### Launch 系统（5 个，`launch/`）

| # | 合约 | 职责 | 状态 |
|---|------|------|------|
| L1 | Launch Campaign | 三段募资 + 55% 触发 + 治理投票 + 退出 | 已写 |
| L2 | Project Token | 标准 TEP-74，元数据前端填入 | 已写 |
| L3 | Vesting | 团队 38% 分 10 轮价格解锁 | 已写（需改写） |
| L4 | Governance | 持有 50% TON + 10% 运营代币 | 待写 |
| L5 | Token Launcher | 部署 Project Token 的工厂 | 已写 |

### 基础设施

| # | 合约 | 职责 | 状态 |
|---|------|------|------|
| I1 | Oracle | 平台控价（第一期手动喂价） | 待写 |

---

## 三、测试网部署状态

> 平台对外地址名以本节为准；代码目录或旧文案可能保留历史命名。

### 已部署

| 平台地址名 | 说明 | 备注 |
|------------|------|------|
| `VC_JETTON` | 平台 VC Jetton 主合约 | 已在测试网部署 |
| `FUND` | 平台 Fund 合约 | 已在测试网部署 |
| `VC_REWARD_POOL` | VC 奖励池 / 储备池 | 已在测试网部署 |
| `EARLY_FUNDRAISING` | 早期募资 / 早期认购合约 | 已在测试网部署；统一替代旧地址名 `EARLY_SUB` |
| `LAUNCH_FEE` | Launch Fee 合约 | 已在测试网部署 |
| `TOKEN_LAUNCHER` | Token Launcher 工厂合约 | 已在测试网部署 |

### 未提供地址或待写

| 平台地址名 / 合约 | 状态 | 说明 |
|-------------------|------|------|
| `Governance` | 待写 / 未提供测试网地址 | 每个 Launch 或治理实例需后续补齐 |
| `Oracle` | 待写 / 未提供测试网地址 | 第一期手动喂价或备用价格源需后续补齐 |
| per-launch `Campaign` | 未提供测试网地址 | 每个项目一个 Launch Campaign 实例，地址随项目生成 |
| `Project Token` | 未提供测试网地址 | 每个项目成功后部署，地址随项目生成 |
| `Vesting` | 待写 / 未提供测试网地址 | 每个项目团队锁仓实例需后续补齐 |

### 命名映射

| 旧名称 / 旧地址名 | 新平台地址名 | 说明 |
|-------------------|--------------|------|
| `Early Subscription` | `EARLY_FUNDRAISING` | 文案统一使用“早期募资 / Early Fundraising”语义 |
| `EARLY_SUB` | `EARLY_FUNDRAISING` | 平台地址名统一使用 `EARLY_FUNDRAISING` |
| `early-subscription` | `EARLY_FUNDRAISING` | 代码路径仍可能叫 `contracts/contracts/platform/token-system/early-subscription/`，但平台地址名统一用 `EARLY_FUNDRAISING` |

---

## 四、各合约关键设计

### Vesting（价格解锁，固定模板）

```
- 2% TGE 立即释放
- 38% 分 10 轮，每轮 3.8%
- initialPrice = 用户募资均价（合约自动算）
- 第一轮触发价 = avgPrice × (1 + 50%)^1
- 第 N 轮触发价 = avgPrice × (1 + 50%)^N
- 维持 24 小时（TWAP 或 Oracle 确认）
- TGE → 第 1 轮：30 天时间自动解锁（不需要喂价）
- DEX 上线后：TWAP 链上自动对价
```

### Governance（投票治理）

```
持有：
  - 50% TON（募资锁定部分）
  - 10% 运营代币（项目方可申请，投票释放）

规则：
  - 项目方提交申请（金额 + 用途）
  - 投票权重 = sqrt(持仓量)
  - 投票率 ≥ 15%，同意 > 50% 通过
  - 连续 3 次被拒 → 平台介入
```

---

## 五、目录结构

```
contracts/
├── contracts/
│   ├── platform/
│   │   ├── token-system/
│   │   │   ├── vc-jetton/         # P1
│   │   │   ├── fund/              # P2
│   │   │   ├── strategic/         # P3
│   │   │   ├── early-subscription/ # P4
│   │   │   └── launch-fee/        # P5
│   │   └── infra/
│   │       ├── token-launcher/    # L5
│   │       └── oracle/            # I1
│   │
│   ├── launch/
│   │   ├── launch-campaign/       # L1
│   │   ├── project-token/         # L2
│   │   ├── vesting/               # L3
│   │   └── governance/            # L4
│   │
│   └── infra/
│       └── bot-wallet/
│
├── wrappers/
├── tests/
├── package.json
└── tsconfig.json
```

---

## 六、TGE 流通量

| 来源 | 比例 | 说明 |
|------|------|------|
| 投资者 | 35% | 立即流通 |
| 团队首解锁 | 2% | 立即流通 |
| 平台 Fund | 10% | 持有不抛 |
| 运营 | 10% | 项目方调用 |
| 流动性 | 5% | 建池子 |
| 团队锁仓 | 38% | 价格解锁 |

**TGE 实际抛压 = 35% + 2% = 37%**

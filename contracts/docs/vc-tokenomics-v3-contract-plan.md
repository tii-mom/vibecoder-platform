# VC Tokenomics v3 — Contract Plan

> **Status:** Pending decision. This document freezes the new $VC 9.8 亿 economic model as the target for future contract work. It does not represent current on-chain state. No code, deployment, or ABI changes are included in this plan document.

---

## 一、VC 总供应

| Property | Value |
| --- | --- |
| Token symbol | `$VC` |
| Total supply | **980,000,000 VC** |
| Decimals | **9** |
| Base unit | nano VC |
| nano total supply | **980,000,000,000,000,000 nano VC** |

> **Testnet note:** Current testnet total supply is 980,010,002 VC (extra 10,002 VC from Tonkeeper visibility test mint). This is a legacy testnet artefact; the mainnet v3 model uses exactly 980,000,000 VC.

---

## 二、VC v3 分配表

| # | 分配类别 | VC | nano VC |
| --- | --- | ---: | ---: |
| 1 | 普通开发者奖励 | 100,000,000 | 100,000,000,000,000,000 |
| 2 | 发展基金 | 100,000,000 | 100,000,000,000,000,000 |
| 3 | 生态合约奖励 | 100,000,000 | 100,000,000,000,000,000 |
| 4 | 团队锁定 | 200,000,000 | 200,000,000,000,000,000 |
| 5 | 流动性钱包 | 50,000,000 | 50,000,000,000,000,000 |
| 6 | 早期运营及支持 | 30,000,000 | 30,000,000,000,000,000 |
| 7 | 投资及预留 | 100,000,000 | 100,000,000,000,000,000 |
| 8 | 销售和阶段释放 | 300,000,000 | 300,000,000,000,000,000 |
| **总计** | | **980,000,000** | **980,000,000,000,000,000** |

### 价格标尺

价格以 USD × 1,000,000 存储（整数，避免浮点数）：

| USD | stored value |
| --- | ---: |
| $0.002000 | 2,000 |
| $0.005000 | 5,000 |
| $0.012500 | 12,500 |
| $0.031250 | 31,250 |
| $0.078125 | 78,125 |
| $0.195312 | 195,312 |
| $0.488281 | 488,281 |
| $1.220703 | 1,220,703 |
| $3.051758 | 3,051,758 |
| $7.629395 | 7,629,395 |

---

## 三、推荐合约拆分

### 3.1 VC_JETTON

- **职责：** 平台原生代币 master contract，固定供应 **980,000,000 VC**。
- **主网策略（待决策）：** revoke / timelock / multisig 三选一。不允许主网保留个人 wallet 无限 mint 权限。
- **当前状态：** 测试网已有旧版 VC_JETTON，但 admin 未撤销，mintable 仍为 -1。

### 3.2 DeveloperRewardPool — 100,000,000 VC

- **职责：** 普通开发者奖励。
- 每个成功发射项目，至少 5 位用户参与后，开发者可领取 5,000 VC。
- 必须防重复领取（按 campaign address / project id 唯一绑定）。
- 不承载生态用户奖励（在 EcosystemRewardPool）。

**建议 get methods:**
- `getDeveloperPoolData` — remaining, totalClaimed, projectCount
- `getProjectDeveloperReward(project)` — claimed, amount, claimTime
- `hasDeveloperClaimed(project)` — bool

### 3.3 DevelopmentFund — 100,000,000 VC

- **职责：** 平台发展基金，管理员决定投资方向。
- 资金只能转出到合约地址，需要 allowlist 或 contract-only 校验。
- 必须记录用途、目标合约、金额。

**建议 get methods:**
- `getDevelopmentFundData` — remaining, totalDisbursed
- `getInvestmentRecord(id)` — amount, destination, purpose, timestamp

### 3.4 EcosystemRewardPool — 100,000,000 VC

- **职责：** 生态用户奖励（Spark 参与用户 VC 激励）。
- 每位参与发射用户，每投资 1 TON 得 **1,000 VC**。
- **单用户上限 100,000 VC**。
- 首次可领取 **20%**，剩余 **80%** 分 **4 轮**价格解锁：

| 轮次 | 比例 | 累积 | 触发价 (stored value) |
| ---: | ---: | ---: | ---: |
| 1 | 20% | 40% | 12,500 ($0.012500) |
| 2 | 20% | 60% | 78,125 ($0.078125) |
| 3 | 20% | 80% | 488,281 ($0.488281) |
| 4 | 20% | 100% | 3,051,758 ($3.051758) |

- 必须防重复领取（按 user address + campaign address 绑定）。
- 必须绑定 Spark / Launch 参与记录。

**建议 get methods:**
- `getEcosystemPoolData` — remaining, totalAllocated, totalClaimed
- `getUserEcosystemAllocation(user)` — totalAllocation, claimed, unlockedRounds
- `getEcosystemUnlockState` — currentPrice

### 3.5 TeamVesting — 200,000,000 VC

- **职责：** 团队锁仓。10 轮，每轮 20,000,000 VC。
- 第 1 轮发行后立即可释放。

**价格阈值：**

| 轮次 | VC | stored price | USD price |
| ---: | ---: | ---: | ---: |
| 1 | 20,000,000 | — (immediate) | — |
| 2 | 20,000,000 | 5,000 | $0.005000 |
| 3 | 20,000,000 | 12,500 | $0.012500 |
| 4 | 20,000,000 | 31,250 | $0.031250 |
| 5 | 20,000,000 | 78,125 | $0.078125 |
| 6 | 20,000,000 | 195,312 | $0.195312 |
| 7 | 20,000,000 | 488,281 | $0.488281 |
| 8 | 20,000,000 | 1,220,703 | $1.220703 |
| 9 | 20,000,000 | 3,051,758 | $3.051758 |
| 10 | 20,000,000 | 7,629,395 | $7.629395 |

- **v1 使用 admin feed price**，后续接入 Oracle。
- **Implemented in PR-F (feat/team-vesting-v1)**。

### 3.6 ReserveVault — 100,000,000 VC

- **职责：** 投资及预留金库。
- 管理员可转移到其他钱包或合约，必须记录用途。
- 建议后续改为 multisig / timelock。

**建议 get methods:**
- `getReserveVaultData` — remaining, transferCount
- `getReserveTransferRecord(id)` — amount, destination, purpose, timestamp

### 3.7 SaleVesting — 300,000,000 VC

- **职责：** 新用户销售与阶段释放。

**三档销售：**

#### Tier A: 99 TON → 80,000 VC
| 轮次 | 比例 | 触发价 (stored) |
| ---: | ---: | ---: |
| TGE | 30% | immediate |
| 1 | 35% | 78,125 ($0.078125) |
| 2 | 35% | 3,051,758 ($3.051758) |

#### Tier B: 299 TON → 250,000 VC
| 轮次 | 比例 | 触发价 (stored) |
| ---: | ---: | ---: |
| TGE | 20% | immediate |
| 1 | 20% | 12,500 ($0.012500) |
| 2 | 20% | 78,125 ($0.078125) |
| 3 | 20% | 488,281 ($0.488281) |
| 4 | 20% | 3,051,758 ($3.051758) |

#### Tier C: 599 TON → 599,000 VC
10 轮，每轮 10%，使用 TeamVesting 相同价格阈值。第 1 轮 immediate。

- 总销售 allocation 不得超过 300,000,000 VC。
- **v1 使用 admin feed price**。
- **Implemented in PR-E (feat/sale-vesting-v1)**。

---

## 四、当前合约映射

| 当前合约 | v3 状态 | 说明 |
| --- | --- | --- |
| `VC_JETTON` | **沿用** | v3 mainnet 需要固定供应策略。 |
| `FUND` | **需要重构** | 拆成 `DevelopmentFund` + `ReserveVault`。 |
| `VC_REWARD_POOL` | **需要重构** | 拆成 `DeveloperRewardPool` + `EcosystemRewardPool`。 |
| `EARLY_FUNDRAISING` | **建议冻结** | 由 `SaleVesting` 替换。 |
| `LAUNCH_FEE` | **沿用** | VC stake / deployment fee。 |
| `TOKEN_LAUNCHER` | **沿用** | 受控部署 ProjectToken。 |
| `LaunchCampaign` | **沿用** | Spark / 55% 触发 / 治理投票。 |
| `ProjectToken` | **沿用** | fixed supply / disable mint (PR-C)。 |
| `ProjectTokenWallet` | **沿用** | 标准 Jetton wallet。 |
| `Vesting` | **冻结或重写** | 不匹配新模型。 |
| `Governance` | **暂不实现** | D1 / off-chain。 |
| `Oracle` | **暂不实现** | admin feed + 后端 indexer。 |
| `EarlySubscription` | **不恢复** | 已移除。 |
| `Strategic` | **不恢复** | 已移除。 |

---

## 五、实施顺序

### P0（安全修复 — 已完成或进行中）

| # | 任务 | PR |
| --- | --- | --- |
| P0-1 | TokenLauncher admin gate | PR-A |
| P0-2 | LaunchFee Jetton-only | PR-A2 |
| P0-3 | ProjectToken mint cap / disable mint | #21 (PR-C) |
| P0-4 | VC_JETTON mainnet 固定供应策略 | 待决策 |

### P1（VC v3 新合约）

| # | 任务 | PR / 状态 |
| --- | --- | --- |
| P1-1 | VC Tokenomics v3 文档 | #22 (PR-D) |
| P1-2 | SaleVesting 300M | #23 (PR-E) |
| P1-3 | TeamVesting 200M | #24 (PR-F) |
| P1-4 | DeveloperRewardPool 100M | PR-G 进行中 |
| P1-5 | EcosystemRewardPool 100M | PR-H 进行中 |
| P1-6 | DevelopmentFund 100M | 待实现 |
| P1-7 | ReserveVault 100M | 待实现 |

### P2（治理 + 基础设施）

| # | 任务 |
| --- | --- |
| P2-1 | Governance（独立合约） |
| P2-2 | Oracle（独立合约或链下过渡） |
| P2-3 | multisig / timelock |
| P2-4 | Dune / indexer / analytics |

---

## 六、完成/未完成状态

### 已完成（main 分支）

- testnet 6 个旧版平台合约部署
- Spark On-chain Gate v1 (PR #20 merged)
- EarlySubscription / Strategic 移除

### 进行中（PR 待合并）

- #21 PR-C: ProjectToken mint cap / disable mint
- #22 PR-D: VC Tokenomics v3 文档（本文件）
- #23 PR-E: SaleVesting v1
- #24 PR-F: TeamVesting v1

### 未完成

- DeveloperRewardPool **PR-G 进行中**
- EcosystemRewardPool **PR-H 进行中**
- DevelopmentFund **未实现**
- ReserveVault **未实现**
- Governance **未实现**
- Oracle **未实现**

> **注意：** 本 PR-D 文档本身不实现任何上述未完成内容。

---

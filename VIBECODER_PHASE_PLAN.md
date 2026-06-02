# VibeCoder 阶段执行计划 v3.0

> 给执行线程的完整工作计划。基于 `CONTRACTS.md` v2.0 最终合约方案 + TON 生态调研。

---

## 项目根目录文档索引

| 文档 | 用途 | 状态 |
|------|------|------|
| `CONTRACTS.md` | **合约唯一事实来源**（11 合约 + TON/Token 分配模型） | v2.0 最终 |
| `VIBECODER_PLAN.md` | 产品方案+执行计划 | 部分过时（合约模型已更新） |
| `VIBECODER_FRONTEND_PROMPTS.md` | 前端生成提示词 | 需更新对齐新模型 |
| `VIBECODER_REMAINING_WORK.md` | 旧版剩余工作计划 | 已被本文档替代 |

**核心原则**：合约部分已确认完毕，不动代码。只做前后端 + 工具链升级。

---

## 当前完成状态

```
✅ P0：构建通过 + Fund→Spark 全局重命名
✅ P1A：Feed + Spark 弹窗 + 庆祝 + Portfolio
✅ P1B：TonConnect 真实连接 + testnet 余额
✅ P2：团队 Spark + 邀请 + 成就 + TG 通知
✅ P2.5：前端清理（Sidebar 收敛、死代码删除）
✅ P3 前端：Project Health 面板 + governanceStore + Governance/Exit Tab
✅ P4 前端：三段式定价弹窗 + 30/50/20 饼图 + 退出 UI + 代币效用卡片
⏳ 后端：Worker 骨架已有，D1 Schema 已有，需补充新模型的 API
⏳ 合约：代码已有（待对齐新模型）
```

---

## 最新测试网平台合约地址

> 来源：当前 `contracts/scripts/mint-vc.ts` 使用的 testnet 常量。`EARLY_FUNDRAISING` 为统一命名，后续文档、环境变量、D1 `platform_contracts` 与前端展示都必须使用该名称。

| # | 平台组件 | 统一键名 | Testnet 地址 | 上线分级 |
|---|----------|----------|--------------|----------|
| 1 | VC Jetton Master | `VC_JETTON` | `UQDwO6ai0zr0UVekU-NIqI_eCTKCICrkt2zGMnAzNJrk58dO` | 上线前必须 |
| 2 | Platform Fund | `FUND` | `UQDVccelkngo4cX9KkkL109Mf7tYRlwLNC4zrj_cdKfbM8Ha` | 上线前必须 |
| 3 | Strategic Reserve | `STRATEGIC` | `UQBFKyg4osbhB7pRtzwcTmyCBuyPn4H3LJdHaWJ6HqIj5eH8` | 上线前必须 |
| 4 | Early Fundraising | `EARLY_FUNDRAISING` | `UQBSEb8LI6QZVDjFOLdV6i4cEYDlTJ7g-mY94l1u6F16t5QT` | 上线前必须 |
| 5 | Liquidity / LP Wallet | `LIQUIDITY` | `UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq` | 上线前必须 |
| 6 | Platform Deployer | `DEPLOYER` | `UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq` | 上线前必须 |

---

## 当前阻塞（上线前必须清零）

| 阻塞项 | 当前状态 | 上线前验收标准 | 负责人/落点 |
|--------|----------|----------------|-------------|
| Spark 未链上 | Spark 仍存在 mock / 本地混合记账路径 | Spark 提交走 Launch Campaign 合约交易；D1 仅做索引与缓存；Portfolio 以链上事件/余额为准 | 阶段 2.2 + Launch Campaign 联调 |
| VC 余额未读 Jetton | 已接 testnet TON 余额，但 VC 余额仍未完整读取 Jetton Wallet | 根据用户钱包派生 VC Jetton Wallet，读取余额并在前端统一展示；无钱包时显示未连接态 | 阶段 2.1 `/platform/contracts` + 钱包服务 |
| bounty 未接前端 | Bounty API / 表设计已有规划，前端入口和领取流程未形成闭环 | BountyPage 接 Worker API：列表、提交、质押状态、余额、claim 均可用 | 阶段 4.2-4.3 |
| claim 未链上发放 | claim 仍停留在 D1 pending / 设计层 | `/api/v1/bounty/claim` 触发 VC Jetton transfer 或批量发放任务，并记录链上 tx hash | 阶段 4.5 |
| mock seed 未隔离 | demo seed / mock 数据仍可能进入真实 testnet 流程 | 所有 mock seed 仅在 dev/demo profile 启用；生产/testnet API 与前端构建默认禁用 mock 写入 | 阶段 2.2 + 配置清理 |

---

## 上线分级总览

### 上线前必须完成（MVP Gate）

1. **链上闭环**：Spark 上链、VC Jetton 余额读取、claim 链上发放、关键合约地址进入 Worker/D1/前端同一事实源。
2. **前端闭环**：Spark 弹窗、Portfolio、BountyPage、Claim 状态全部接 Worker API，不再依赖 mock 写入。
3. **数据隔离**：mock seed、demo 钱包、测试任务与真实 testnet 数据分库/分 profile 隔离。
4. **命名统一**：所有对外文档、API key、表字段、环境变量统一使用 `EARLY_FUNDRAISING`。
5. **上线验收**：至少完成一次真实 testnet 钱包连接 → 读 VC Jetton → Spark → bounty 完成 → claim 到钱包的端到端演练。

### 上线后优化（Post-Launch）

1. Acton 原生测试迁移、合约开发体验优化。
2. Operations / Vesting 深度页面、图表与高级治理分析。
3. TON Pay 法币入金、Jetton 支付 Spark。
4. Agentic Wallet、Copilot 自动化、自动投票/自动退出策略。
5. 外部链代币赏金、跨链验证增强、仲裁与 slashing 高级流程。

---

## 阶段 0：Acton 工具链升级（1 天）｜上线后优化

**目标**：替换 Blueprint → Acton，简化合约开发工具链。

### 任务 0.1：安装 Acton

```bash
curl -LsSf https://github.com/ton-blockchain/acton/releases/latest/download/acton-installer.sh | sh
```

### 任务 0.2：Acton + Blueprint 共存

⚠️ **不要删除 Blueprint**——当前 TypeScript 测试依赖 `@ton/sandbox` + Jest，删除后无法跑测试。

进入 `contracts/` 执行：
1. 运行 `acton init` 生成 `Acton.toml`
2. 运行 `acton build` 验证所有 10 个 .tolk 文件能编译
3. **保留** `package.json`、`tsconfig.json`、`wrappers/`、`node_modules/`
4. 继续使用 `npm test`（Blueprint + Jest + Sandbox）执行原有测试
5. 后续逐步将测试迁移到 Acton 原生的 `.test.tolk`

### 任务 0.3：更新合约代码

Acton 的 Tolk 版本可能略有语法差异。检查和修复编译错误。

---

## 阶段 1：前端对齐新合约模型（2-3 天）｜上线前必须

**目标**：前端展示从旧模型（30/50/20）更新为新模型。

### 任务 1.1：更新 TON 分配展示

新 TON 分配（`CONTRACTS.md` 一）：
```
30% → 团队钱包           （55% 触发后立即释放）
50% → 治理合约           （团队申请 → 投票释放）
18% → 项目方              （自行支配）
2%  → 平台 Fund           （平台费）
```

替换当前 Project Health 面板中的 30/50/20 饼图。

### 任务 1.2：更新 Token 分配展示

新 Token 分配：
```
35% → 投资者             （TGE 立即）
40% → 团队 Vesting       （2% TGE + 38% 价格解锁 10 轮）
10% → 运营合约           （项目方可调用）
10% → 平台 Fund          （TGE 转入）
5%  → 项目方 LP          （配合 18% TON 建池子）
```

### 任务 1.3：更新 governanceStore

- Token 分配模型更新（35/40/10/10/5）
- TON 治理投票逻辑（50% 锁定在 Governance 合约）
- 运营代币 10% 的申请/投票流程

### 任务 1.4：更新 D1 Schema

`worker/migrations/0001_schema.sql` 需要新增表和对齐新字段：
- `launches` 表：添加 `team_vesting_total`, `ops_token_pool`, `platform_fee_percent` 等
- 新建 `platform_contracts` 表：记录所有平台合约的链上地址

---

## 阶段 2：Worker API 补充（2-3 天）｜上线前必须

### 任务 2.1：补充 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/launches/:id/health` | GET | Project Health 数据（新分配模型） |
| `/api/v1/launches/:id/vesting` | GET | 团队 Vesting 状态（10 轮进度） |
| `/api/v1/launches/:id/operations` | GET/POST | 运营代币申请/审批 |
| `/api/v1/launches/:id/governance/stats` | GET | 治理投票统计 |
| `/api/v1/platform/contracts` | GET | 平台合约地址列表 |

### 任务 2.2：前端 → 后端联调

- Spark 弹窗的三段式定价数据从 mock → Worker API
- Project Health 面板数据从 mock → Worker API
- 治理投票的提交从 mock → Worker API

---

## 阶段 3：前端新增页面（3-5 天）｜上线后优化

### 任务 3.1：Vesting 进度页

在 LaunchDetail 新增 `Vesting` Tab：
```
团队代币：40%（2% TGE + 38% 待解锁）
├── 解锁进度：第 1/10 轮
├── 当前价格：0.015 TON
├── 下一轮触发价：0.0225 TON（需涨幅 50%）
├── 价格维持剩余：18 小时 / 24 小时
└── 已解锁：5.8% / 40%
```

### 任务 3.2：运营治理页

在 LaunchDetail 新增 `Operations` Tab：
```
运营代币池：10%（项目方可申请）
├── 已使用：2.3% / 10%
├── 申请历史列表
├── [团队申请] 按钮 → 填写金额 + 用途
└── 持币人投票面板
```

### 任务 3.3：Vesting Store

创建 `src/store/vestingStore.ts`：
- 10 轮解锁状态
- 当前 Oracle 价格
- 历史价格走势（支持图表）
- 解锁触发时间线

---

## 阶段 4：赏金任务系统（1-2 周）⭐ 增长引擎｜核心闭环上线前必须，高级玩法上线后优化

**目标**：VC 的内循环经济。项目方/用户发起赏金任务，用户完成赚 VC。实现"赏金 > 赚 VC > 用 VC > 更多人发赏金"的正循环。

### 核心设计

```
奖励         ：仅 VC
代币赏金门槛 ：三级质押体系（均锁 6 个月）
验证         ：Bot 自动验证（X API / TG Bot API / 链上数据）
奖励流向     ：机器人钱包（链下记账，链上批次提取）
Gas 策略     ：累积提取（手动/每周自动/到额度触发）
跨链支持     ：不做跨链桥，创作者手动发币，VC 质押兜底
```

#### 三级质押体系

| 等级 | 创作者身份 | 质押 VC | 赏金代币范围 |
|------|-----------|---------|------------|
| ⭐ | VibeCoder 平台项目方 | **1 万** | 自己的项目代币（已在平台成功 Launch 并部署） |
| ⭐⭐ | TON 链外部项目方 | **10 万** | TON 链代币（未通过平台 Launch） |
| ⭐⭐⭐ | 非 TON 链项目方 | **50 万** | BSC / ETH / SOL 等任意链代币 |

> VC 开发者（平台项目方）已通过 Launch 验证，风险最低，质押门槛也最低。
> 外部链创作者匿名度高，50 万 VC 质押 = 实质性信誉担保。

### 任务 4.1：D1 新增表（上线前必须）

`worker/migrations/0002_bounty.sql`：

```sql
CREATE TABLE bounty_tasks (
  id TEXT PRIMARY KEY,
  creator_id TEXT,
  creator_type TEXT,           -- PROJECT / USER
  task_type TEXT,              -- FOLLOW_X / RETWEET / JOIN_TG / JOIN_DISCORD / SPARK / INVITE
  title TEXT,
  description TEXT,
  target_url TEXT,             -- 外链（X/ TG/ Discord）
  reward_amount REAL,          -- 单人奖励 VC
  reward_token TEXT DEFAULT 'VC',
  total_slots INT,             -- 总份数
  completed_slots INT DEFAULT 0,
  creator_tier INTEGER DEFAULT 0,  -- 0=平台项目方(1万) 1=TON外部(10万) 2=非TON(50万)
  vc_stake REAL,               -- 已质押 VC 数
  is_token_reward INTEGER DEFAULT 0, -- 0=VC奖励 1=代币奖励（需 VC 质押）
  token_reward_chain TEXT,      -- 代币所在链：TON/BSC/ETH/SOL...
  token_reward_type TEXT,      -- 代币合约地址（仅 is_token_reward=1 时）
  token_reward_amount REAL,    -- 代币奖励数（仅 is_token_reward=1 时）
  status TEXT DEFAULT 'ACTIVE',-- ACTIVE / COMPLETED / EXPIRED / CANCELLED
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bounty_submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  user_id TEXT,
  status TEXT DEFAULT 'PENDING',  -- PENDING / VERIFIED / REJECTED
  reward_vc REAL,
  reward_token TEXT,
  reward_amount REAL,
  claimed INTEGER DEFAULT 0,      -- 0=未提 1=已提
  verified_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bounty_stakes (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  creator_tier INTEGER DEFAULT 0, -- 0=平台项目方 1=TON外部 2=非TON
  vc_amount REAL,
  locked_at TEXT,
  unlock_at TEXT,              -- locked_at + 6 个月
  status TEXT DEFAULT 'ACTIVE' -- ACTIVE / UNLOCKED / SLASHED
);

CREATE TABLE user_vc_balances (
  user_id TEXT PRIMARY KEY,
  pending_vc REAL DEFAULT 0,  -- 机器人钱包待提取 VC
  total_earned_vc REAL DEFAULT 0,
  updated_at TEXT
);
```

### 任务 4.2：Worker API — 赏金（上线前必须）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/bounty/tasks` | GET | 任务列表（支持 type/status 筛选） |
| `/api/v1/bounty/tasks` | POST | 创建任务（检查 VC 质押） |
| `/api/v1/bounty/tasks/:id` | GET | 任务详情 |
| `/api/v1/bounty/tasks/:id/submit` | POST | 提交完成（Bot 自动验证） |
| `/api/v1/bounty/stake` | POST | 质押 VC（1万/10万/50万分级） |
| `/api/v1/bounty/stake/status` | GET | 查询质押状态 |
| `/api/v1/bounty/balance` | GET | 用户待提取 VC |
| `/api/v1/bounty/claim` | POST | 提取 VC 到钱包 |

### 任务 4.3：前端 — 赏金市场页（上线前必须）

新建 `src/pages/BountyPage.tsx`：

```
┌──────────────────────────────────────────┐
│  🎯 赏金市场                              │
│  ──────────────────────────────────────── │
│  [筛选: VC | TON代币 | 外部链代币]         │
│                                          │
│  ┌─ 项目 X 发起（平台 ⭐ 质押 1 万）───────┐│
│  │ 关注 @projectx 官方 X 账号             │ │
│  │ 奖励: 2 VC × 200 份  已完成: 87/200    │ │
│  │ [接任务] [机器人托管]                   │ │
│  └───────────────────────────────────────┘│
│                                          │
│  ┌─ 项目 Y 发起（TON ⭐⭐ 质押 10 万）──────┐│
│  │ 加入 Telegram 社区群                   │ │
│  │ 奖励: 50 $TOKEN × 50 份 已完成: 12/50  │ │
│  │ [接任务] [填 TON 钱包地址]              │ │
│  └───────────────────────────────────────┘│
│                                          │
│  ┌─ 项目 Z 发起（BSC ⭐⭐⭐ 质押 50 万）────┐│
│  │ 转发推文 + 关注                         │ │
│  │ 奖励: 100 $BSC_TOKEN × 100 份          │ │
│  │ 已完成: 3/100                           │ │
│  │ [接任务] [填 BSC 钱包地址]              │ │
│  └───────────────────────────────────────┘│
│                                          │
│  ┌─ 我的收益 ────────────────────────────┐ │
│  │ 待提取: 47 VC  │  累计: 156 VC        │ │
│  │ [一键提取到钱包] [设置自动提取]         │ │
│  └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```
```

### 任务 4.4：Bot 自动验证引擎（上线前必须：TON/VC；上线后优化：外部链增强）

Worker `services/bounty/verifier.ts`：

```
任务提交 → 根据 task_type 调对应 API：
  FOLLOW_X    → X API: GET /2/users/{id}/following（查是否关注）
  RETWEET     → X API: GET /2/tweets/{id}/retweeted_by（查是否转发）
  JOIN_TG     → TG Bot API: getChatMember（查是否在群）
  JOIN_DISCORD→ Discord API: GET /guilds/{id}/members/{id}
  SPARK       → D1: spark_records WHERE user_id + launch_id
  INVITE      → D1: invite_records WHERE referrer_id + new_user_id

验证通过 → D1: bounty_submissions status=VERIFIED
  → user_vc_balances.pending_vc += reward_vc
  → 前端: "✅ 任务完成! +2 VC"
```

### 任务 4.5：VC 提取 + Gas 优化（上线前必须：手动 claim；上线后优化：批量/自动）

```
提取触发方式（3 选 1，用户设置）：

① 手动提取：用户点"提取" → Worker 调 VC Jetton transfer
② 每周自动：Worker cron job 每周末批量清算
③ 额度触发：pending_vc ≥ 用户设定的阈值 → 自动提取

批量提取：
  多个用户的 VC 提取 → Worker 合并为少量链上转账
  → 每个用户只付 1 次 gas（0.005 TON，从提取额中扣）
```

### 任务 4.6：VC 质押管理（上线前必须：平台/TON 质押；上线后优化：外部链仲裁）

Worker `services/bounty/staking.ts`：
- 用户转 10 万 VC 到平台钱包 → Worker 记 `bounty_stakes`
- 到期自动标记 `UNLOCKED` → 用户可提取
- 创建代币赏金任务时 → 检查 `bounty_stakes.status = ACTIVE AND vc_amount >= 100000`

---

## 阶段 5：TG Mini App 适配（1-2 周）｜上线后优化

### 任务 5.1：TG WebApp SDK 集成

在 `vc/` 前端中：
1. 安装 `@telegram-apps/sdk`
2. 在 `main.tsx` 初始化 Telegram Mini App
3. 适配 UI：头部返回按钮、底部安全区、主题颜色

### 任务 5.2：TG Bot 配置

1. 在 Telegram BotFather 创建 Bot
2. 设置 Mini App URL（指向 Cloudflare Pages 部署地址）
3. 配置 `/start` 命令打开 Mini App

### 任务 5.3：TON Connect in Mini App

Mini App 内的钱包连接方式：
- 用户点击"连接钱包" → 跳转 Tonkeeper/MyTonWallet 的 TG Mini App
- 钱包确认 → 返回 VibeCoder Mini App

### 任务 5.4：TON Pay 集成（可选）

```bash
npm install @ton-pay/api @ton-pay/react
```

在 Spark 确认页面添加 TON Pay 支付按钮，支持：
- 法币入金 → 自动 Spark
- Jetton（USDT）支付 Spark

---

## 阶段 6：Agentic Wallet + AI 自动化（2-3 周）｜上线后优化

### 任务 6.1：Agentic Wallet 创建流程

1. 用户在前端点击"创建 AI 钱包"
2. 调 `@ton/mcp` 的 `agentic_start_root_wallet_setup`
3. 用户用主钱包签名 → Agentic Wallet 部署
4. VibeCoder Worker 持有 Operator Key → 可替用户执行操作

### 任务 6.2：Copilot + @ton/mcp 打通

当前 Copilot（AI 共建助手）接入 `@ton/mcp`：
- 用户问："这个项目评分多少？值得投吗？"
- Copilot 调链上数据 → 分析 → 给出建议
- 用户说："Spark 10 TON" → Copilot 调 `send_ton` → 完成

### 任务 6.3：自动化规则引擎

Worker 后端建 `services/automation/`：
```
用户设定规则：
  "新项目评分 > 85 → 自动 Spark 10 TON"
  "持有的项目 7 天未更新 → 自动退出"
  "团队提款申请 < 1000 TON → 自动投票同意"

Worker 每 1 小时 → 检查所有规则 → 匹配的 → 用 Agentic Wallet 执行
```

### 任务 6.4：TG Bot 通知增强

在现有 TelegramNotificationToast 基础上增强：
- 自动投票结果通知
- 自动 Spark 成功通知
- 退出窗口即将关闭提醒

---

## 执行顺序

```
阶段 0（1 天）    → Acton + Blueprint 共存（上线后优化）
阶段 1（2-3 天）  → 前端对齐新合约模型（上线前必须）
阶段 2（2-3 天）  → Worker API 补充（与阶段 1 并行，上线前必须）
阶段 3（3-5 天）  → 前端新增页面（Vesting + Operations，上线后优化）
阶段 4（1-2 周）  → ⭐ 赏金任务系统（bounty 前端 + claim 上线前必须；外部链高级玩法上线后优化）
阶段 5（1-2 周）  → TG Mini App 适配 + TON Pay（上线后优化）
阶段 6（2-3 周）  → Agentic Wallet + Copilot 打通（上线后优化）
```

---

## 关键参考

- **合约文档**：`/Users/yudeyou/Desktop/VC/CONTRACTS.md`（v2.0 最终版）
- **合约代码**：`/Users/yudeyou/Desktop/VC/contracts/`
- **前端代码**：`/Users/yudeyou/Desktop/VC/vc/src/`
- **后端代码**：`/Users/yudeyou/Desktop/VC/worker/`
- **合约不修改**——11 个合约方案已确定，等文档 + 前后端调通后再动合约代码

---

## 赏金系统设计决策

| 决策 | 结论 |
|------|------|
| 奖励币种 | 仅 VC |
| 平台项目方代币赏金 | 质押 1 万 VC，6 月锁 |
| TON 外部项目代币赏金 | 质押 10 万 VC，6 月锁 |
| 非 TON 链代币赏金 | 质押 50 万 VC，6 月锁 |
| 质押管理 | P4 Worker+D1，P5 升级独立锁仓合约 |
| 外部链奖励分发 | 创作者手动打币，VC 质押兜底 |
| 用户投诉 + 违约惩罚 | 平台仲裁 → 扣质押 VC → 赔用户 |
| 机器人参与范围 | 仅 TON 链（VC 奖励 + 平台项目代币），外部链只做验证不发币 |
| 提取方式 | 3 选 1：手动 / 每周自动 / 到额度触发 |
| Gas | 用户只付提取时的 1 次 gas |

---

## 当前任务

**立即执行上线前 Gate**：优先清零“当前阻塞”中的 5 项（Spark 上链、VC Jetton 余额、bounty 前端、claim 链上发放、mock seed 隔离）。

**随后执行上线后优化**：Acton + Blueprint 共存（`acton init` + `acton build`，保留 npm test），再推进 Vesting / Operations / TG Mini App / Agentic Wallet。

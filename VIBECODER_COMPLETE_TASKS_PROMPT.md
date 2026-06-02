> [!WARNING]
> FROZEN: Historical one-shot execution prompt with stale task state. Use REMAINING_TASKS.md.
> Registry: [DOCS_FREEZE.md](./DOCS_FREEZE.md)

你现在是 VibeCoder 项目的全栈开发工程师。请阅读以下完整背景后，按照优先级执行剩余的开发工作。

---

## 项目背景

VibeCoder = AI 项目发现与 Launch 平台。开发者一次填表发起 Launch（三段式募资），用户用 TON Spark 支持项目。55% 募资达成后自动部署代币并分配。代币上市前有真实效用。

**两层命名体系**：
- 平台层名词：`Launch`（如：去 Launch 页面、这个 Launch 快满了）
- 用户层动词：`Spark`（如：我 Spark 了这个项目、按钮 ✦ Spark）

**技术栈**：React 19 + Vite 6 + TypeScript + Tailwind CSS 4 + React Router DOM + Zustand + @tonconnect/ui-react + Recharts + Motion + Lucide React

---

## 当前完成状态

```
P0：构建通过 ✅ / Fund→Spark 全局重命名 ✅
P1A：Feed 信息流 + Spark 弹窗 + 庆祝 + 分享 + Portfolio ✅
P1B：真实 TonConnect 钱包连接 + testnet 余额读取 ✅（$VC Jetton 未部署）
P2：团队 Spark + 邀请 + 成就 + TG 通知 ✅
P3：Launch 上链 + 治理 UI ← 待开始
P4：发币闭环 + 退出机制 UI ← 待开始
```

**当前前端路由**：`/feed /launch /launch/:id /launch/create /copilot /portfolio /invite /settings /devhub /devhub/docs`

---

## 文档索引

所有设计文档位于父目录 `/Users/yudeyou/Desktop/VC/`：

| 文档 | 用途 |
|------|------|
| `VIBECODER_PLAN.md` | 基准文档——产品方案+执行计划（13章+A-J治理模块） |
| `VIBECODER_PRODUCT.md` | 产品白皮书 |
| `VIBECODER_CONTRACTS.md` | 合约体系设计（5合约：Launch Campaign、LP Pool、Token Launcher、Project Token、Vesting） |
| `VIBECODER_FRONTEND_PROMPTS.md` | 前端生成提示词（包含P3/P4新页面规格） |
| `VIBECODER_REMAINING_WORK.md` | 完整剩余工作计划 |

---

## 任务清单

### 第一部分：前端清理（立即执行）

#### 任务 1：删除死代码
- [x] 检查是否有 `ExplorePage.tsx` 存在且未被使用（路由 `/explore` 已重定向到 `/feed`）→ 如果存在则删除 (已完成)
- [x] 检查是否有 `ProjectDetail.tsx` 存在且已被 `LaunchDetail.tsx` 取代 → 删除 (已完成删除)
- [x] 检查是否有任何以 `Fund` 命名的残留文件（`FundPage.tsx` / `FundDetailPage.tsx` / `CreateFundPage.tsx`）→ 删除 (已完成删除)

#### 任务 2：Sidebar 命名对齐
- [x] 将 Sidebar 菜单项 `Spark 星火共建` 改名为 `Launch` (已完成)
- [x] 路由确认：当前 `/spark` 是否已统一为 `/launch`？检查 `App.tsx` 路由表。如果不是，将 `/spark` → `/launch`、`/spark/:id` → `/launch/:id`、`/spark/create` → `/launch/create` (已完成)
- [x] 确认 Sidebar 上的 Launchpad 项是否应该保留（PLAN 要求合并到 Launch 流程中）→ 如果 Launchpad 页面仍然独立存在，将其入口从 Sidebar 移除 (已完成)

#### 任务 3：Sidebar 收敛
- [x] 当前 Sidebar 有 9 个菜单项（探索发现 / Agent Studio / Launch / Launchpad / AI助手 / 持仓 / 邀请 / DevHub / 设置）(已收敛)
- [x] 收敛到 6 个核心项：`Explore / Launch / Copilot / Portfolio / Invite / Settings` (已完成)
- [x] Studio 和 DevHub 移到 Settings 或 Header 的用户菜单中 (已完成，在 Settings 页面中增加了“开发者工作台快速入口”卡片)

---

### 第二部分：P3 治理 UI 前端（已完成）

#### 任务 4：新建 `src/pages/ProjectHealth.tsx` 或内嵌组件
- [x] 在 LaunchDetail 页面新增一个 Tab 叫 `Project Health` (已作为内嵌 Tab 实现，加载更流畅且能共享底层状态)
- [x] 内容参考 `VIBECODER_FRONTEND_PROMPTS.md` 的阶段 5 规格 (已完全实现公开数据面板与待投票面板)

```
公开数据面板（所有用户可见）：
- 当前阶段标签（Stage 1/2/3）
- 55% 阈值进度线（带标记的进度条，显示目标线和当前百分比）
- 募资进度条
- 资金分配饼图：
  30% 团队运营（已释放金额/总额）
  50% 治理锁定（剩余/总额）
  20% LP 池（部署状态）
- 治理合约余额
- 解锁状态（"需投票（代币未达 150%）" 或 "已解锁"）
- 代币价格（含 7 日变化）
- 里程碑进度

待投票面板（仅代币持有人可见）：
- 团队提款申请卡片：金额、用途、当前投票进度（同意/拒绝数）
- 显示用户自己的平方根投票权重
- 同意/拒绝按钮
- 剩余投票时间倒计时
- 投票历史列表
```

**数据来源**：已成功搭建并绑定全局治理 Zustand Store。

#### 任务 5：新建治理 store
- [x] 创建 `src/store/governanceStore.ts` (已完成)
- [x] 包含数据：
  - 项目的提款提案列表（proposalId、提案金额、用途、同意票、反对票、状态、剩余时间）
  - 用户的投票权重（基于持仓量的 sqrt）
  - 投票记录
  - 退出请求列表
- [x] mock 数据：至少 1 个进行中的投票提案 + 2 个历史记录 (已完成，为每个项目初始化了活跃的提款提案及数个已结案的历史记录)

#### 任务 6：新增 Launch 详情页的 Governance Tab
- [x] 列出所有历史投票（已通过/被拒绝的提案、金额、时间）(已完成)
- [x] 退出机制面板（见任务 9） (已提前于 Governance Tab 中实现，包含 30-90 天倒计时、14天静默触发校验以及销毁代币退还 TON 的测算面板)

---

### 第三部分：P4 前端（已完成）

#### 任务 7：Spark 弹窗添加三段式定价展示
- [x] 参考 `VIBECODER_FRONTEND_PROMPTS.md` 阶段 6 规格，修改现有的 Spark 弹窗组件：
  - 顶部显示当前阶段（"🔥 Stage 1 早鸟"）
  - 显示兑换率："1 TON = 100 代币 + 10% 额外奖励"
  - 显示剩余额度和目标额度进度
  - 下方折叠预览："下一阶段预览：Stage 2 · 1 TON = 80 代币"
  - 金额输入 + 快选按钮（5/10/50/100 TON）
  - 单人/团队切换

#### 任务 8：添加 30/50/20 资金分配饼图
- [x] 在 Launch 成功后的项目详情页显示 (已完成，在详情页 Project Health 选项卡中以 Recharts 饼图生动渲染)
- [x] 用 Recharts 饼图 (已完成)
- [x] 三个扇区：团队 30% / 治理 50% / LP 20% (已完成)
- [x] 标注每个分区的金额和状态（已释放 / 锁定中 / 已部署） (已完成)

#### 任务 9：新建退出机制 UI
- [x] 参考 `VIBECODER_FRONTEND_PROMPTS.md` 阶段 6 规格：
  - 仅在 30-90 天退出窗口内显示 (已完成，设置剩余 42 天倒计时与窗口描述)
  - 显示两个核心触发条件的检查状态（代码静默超期触发、跌破发行价未触发） (已完成)
  - 计算可赎回金额 (已完成)
  - 确认退出→显示将销毁的代币数量 (已完成)
  - 退出成功/失败反馈 (已完成)

#### 任务 10：Portfolio 添加代币上市前效用卡片
- [x] 参考 `VIBECODER_FRONTEND_PROMPTS.md` 阶段 6 规格：
  - 在 Portfolio 中，对持有的已部署但未上市的项目代币，显示三张效用卡片：
    - 项目内消耗（调用AI服务扣代币）
    - Backer Pool 质押（获未来 Launch 优先认购权）
    - 治理投票入口 (已全部整合在资产卡片的展开面板中，提供完整的模拟操作日志和响应机制)

---

### 第四部分：后端骨架（与前端并行）

#### 任务 11：搭建 Worker 后端
- 在项目根目录创建 `worker/` 目录
- 初始化 Cloudflare Worker（Hono 框架）
- 配置 `wrangler.toml`（D1 数据库绑定）
- 参考原有 RLAI 项目的 `src/worker/index.ts` 和 `src/worker/trading-routes.ts` 的结构

#### 任务 12：D1 数据库 Schema
创建 `migrations/0001_schema.sql`：

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT,
  ton_wallet TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Launch 项目表
CREATE TABLE launches (
  id TEXT PRIMARY KEY,
  owner_id TEXT,
  name TEXT,
  description TEXT,
  target_total REAL,       -- TON
  stage1_target REAL,
  stage1_rate REAL,        -- 每 TON 兑换代币数
  stage1_bonus REAL,
  stage2_target REAL,
  stage2_rate REAL,
  stage3_rate REAL,
  deploy_threshold REAL,   -- 55%
  raised_total REAL,
  status TEXT,             -- DRAFT/FUNDING/SUCCESS/LIVE/FAILED
  team_share REAL DEFAULT 30,
  governance_share REAL DEFAULT 50,
  lp_share REAL DEFAULT 20,
  deadline TEXT,
  token_deployed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 投资者记录
CREATE TABLE spark_records (
  id TEXT PRIMARY KEY,
  launch_id TEXT,
  user_id TEXT,
  amount REAL,             -- TON
  stage INTEGER,
  tokens REAL,             -- 获得的代币
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 治理投票
CREATE TABLE governance_proposals (
  id TEXT PRIMARY KEY,
  launch_id TEXT,
  amount REAL,
  purpose TEXT,
  yes_weight REAL DEFAULT 0,
  no_weight REAL DEFAULT 0,
  status TEXT,             -- ACTIVE/PASSED/REJECTED
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT
);

-- 投票记录
CREATE TABLE governance_votes (
  id TEXT PRIMARY KEY,
  proposal_id TEXT,
  user_id TEXT,
  weight REAL,             -- sqrt(持仓量)
  vote TEXT,               -- YES/NO
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 退出请求
CREATE TABLE exit_requests (
  id TEXT PRIMARY KEY,
  launch_id TEXT,
  user_id TEXT,
  redeemed_ton REAL,
  burned_tokens REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

### 第五部分：合约开发（后端完成后）

#### 任务 13：Launch Campaign 合约
- 使用 Tolk 语言，在 `src/contracts/launch_campaign.tolk` 中实现
- 参考 `VIBECODER_CONTRACTS.md` 第二节合约详解
- 核心功能：
  - 三段式定价（Stage 1/2/3 不同兑换率）
  - 55% 阈值触发代币部署
  - 30/50/20 资金分账
  - 平方根投票治理
  - 退出机制（30-90 天）
  - 未达 55% 全额退款

#### 任务 14：Token Launcher 合约
- `src/contracts/token_launcher.tolk`
- 部署标准 TEP-74 Jetton
- 按投资者列表分配代币

#### 任务 15：Vesting 合约
- `src/contracts/vesting.tolk`
- 里程碑解锁 + Oracle 喂价
- 管理项目方团队代币的锁仓释放

---

## 执行顺序

```
第 1 步：任务 1-3（前端清理，立即做，1-2 小时）
第 2 步：任务 11-12（后端骨架，与前端并行，2-3 天）
第 3 步：任务 4-6（P3 治理 UI，5-6 天）
第 4 步：任务 7-10（P4 前端，5 天）
第 5 步：任务 13-15（合约，5-7 天）
```

---

## 关键参考

- 两层命名：平台 `Launch` / 用户 `Spark`
- 资金模型：30% 团队立即可用 / 50% 治理投票 / 20% 永久 LP
- 代币时机：55% 达成自动部署
- 投票权重：`sqrt(持仓量)`
- 退出窗口：30–90 天
- 合规：P3 之前全 sandbox，用户端用"支持/共建/Spark"替代"投资"
- 主色 `#635BFF` / 背景 `#0A0B14` / 卡片 `#121620`

开始执行。先从任务 1 的前端清理做起。

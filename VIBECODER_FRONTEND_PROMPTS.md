> [!WARNING]
> FROZEN: Historical generation prompts. Current UI decisions must come from live vc/src code and REMAINING_TASKS.md.
> Registry: [DOCS_FREEZE.md](./DOCS_FREEZE.md)

# VibeCoder 前端生成提示词 v3.0

> 对齐 VIBECODER_PLAN.md v2.0。新增 P3/P4 治理与代币闭环功能。

技术栈：React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + React Router DOM + Recharts + Lucide React + Motion + Zustand + TON Connect UI React
路由：HashRouter
主题：全局深色（#0A0B14，主色 #635BFF）
响应式：桌面端侧边栏 + 移动端底部导航
命名体系：平台层 `Launch` / 用户层 `Spark`

---

## 阶段 0：项目初始化

```
创建 Vite + React + TypeScript 项目。

目录结构：
src/
├── main.tsx / App.tsx / index.css
├── types/ (index.ts, project.ts, spark.ts, governance.ts)
├── store/ (userStore.ts, sparkStore.ts, governanceStore.ts)
├── services/ (api.ts, ton.ts, governance.ts)
├── components/
│   ├── Layout.tsx / Sidebar.tsx / MobileNav.tsx / Header.tsx / WalletButton.tsx
│   ├── feed/ (FeedCard.tsx, FeedSwiper.tsx)
│   ├── spark/ (SparkModal.tsx, SparkCelebration.tsx, TeamSparkModal.tsx)
│   ├── governance/ (VotePanel.tsx, ProjectHealth.tsx, ExitPanel.tsx)
│   └── ui/ (Button, Card, Modal, Tabs, Badge, ProgressBar, ...)
├── pages/
│   ├── LandingPage.tsx
│   ├── FeedPage.tsx            信息流（登录后默认首页）
│   ├── LaunchPage.tsx          项目市场（原 SparkPage）
│   ├── LaunchDetail.tsx        项目详情（含 Project Health、投票、退出）
│   ├── CreateLaunch.tsx        发起 Launch
│   ├── CopilotPage.tsx
│   ├── PortfolioPage.tsx
│   ├── InvitePage.tsx
│   ├── SettingsPage.tsx
```

---

## 阶段 1：布局 + 路由 + Landing

```
App.tsx 路由：
/                → LandingPage（公开）
/feed            → FeedPage（默认首页）
/launch          → LaunchPage
/launch/:id      → LaunchDetail
/launch/create   → CreateLaunch
/copilot         → CopilotPage
/portfolio       → PortfolioPage
/invite          → InvitePage
/settings        → SettingsPage

Layout 包裹除 LandingPage 外的所有路由。

Sidebar 菜单（6 项）：Explore / Launch / Copilot / Portfolio / Invite / Settings
MobileNav：Explore / Launch / Copilot / Portfolio / ☰
LandingPage：Hero "Build. Spark. Earn." + 三步卡片 + 统计数据
```

---

## 阶段 2：Feed 信息流 + Spark 弹窗

```
FeedPage — 全屏竖滑信息流

每个项目一张卡片：
- 封面/视频
- 项目名 + 开发者
- 一句话描述
- 当前阶段标签："Stage 1 早鸟" / "Stage 2 中段" / "Stage 3 末段"
- 三段式定价信息："1 TON = 100 代币 + 10% 奖励"
- 进度条 + 已筹/目标
- "Spark"按钮 + "跳过"按钮

Spark 弹窗：
- 显示当前阶段、兑换率、剩余额度
- 金额快选 + 自定义
- 单人 / 团队切换
- 确认 → 庆祝动画 → 分享卡片
```

---

## 阶段 3：Launch 项目市场 + 详情

```
LaunchPage — 项目市场列表

筛选：分类 + 阶段（早鸟/中段/末段）+ 状态（进行中/已完成）
项目卡片：封面 + 名称 + 阶段标签 + 兑换率 + 进度 + "Spark"

LaunchDetail — 项目详情

Hero：封面 + 项目名 + 开发者 + 55% 阈值进度线 + 阶段标签

Tabs：

Overview — 项目介绍 + 团队 + 演示
Spark — 三段式定价详情 + 已参与人数 + Spark 弹窗入口
Project Health（P3）— 见阶段 5
Governance（P3）— 见阶段 5
Proof — 72H 沙盒模拟器（默认折叠）
Discussion — 评论/问答
```

---

## 阶段 4：Copilot + Portfolio + Invite

```
CopilotPage — AI 评分卡片 + 策略规则 + 执行日志
PortfolioPage — 我的项目 / 我的支持 / 收益 / 资产持仓 / 待投票提醒
InvitePage — 邀请仪表盘 + 三档特权进度 + 成就系统
```

---

## 阶段 5：Project Health 面板 + 治理投票（P3 新增）

```
LaunchDetail 的 "Project Health" Tab：

公开数据面板（团队 + 支持者 + 访客都能看）：

┌──────────────────────────────────────────┐
│  ⚡ 当前阶段：Stage 2 中段                 │
│  📊 募资进度  ████████░░  72%（55% 已达成✅）│
│  🏗 代币状态  已部署 · 已分配              │
│  💰 资金分配                               │
│     30% 团队运营 ████░░  12,000/30,000    │
│     50% 治理锁定 ██████  42,000/50,000    │
│     20% LP 池   ████░░  已部署            │
│  🗳 治理合约  剩余 42,000 TON              │
│  🔒 解锁状态  需投票（代币未达 150%）      │
│  👥 用户    +12% 本月                      │
│  📈 代币    0.42 TON (+15% 7d)           │
│  🏗 里程碑  ●●●●○ 4/5                     │
└──────────────────────────────────────────┘

当有待投票的提款申请时（仅代币持有人可见）：

┌──────────────────────────────────────────┐
│  ⚡ 待投票：团队申请提取 10,000 TON        │
│     用途：服务器扩容 + API 优化            │
│     你的权重：45（持仓 2000 代币）          │
│     当前：12 ✅ / 3 ❌  ·  剩余 48 小时     │
│     [✅ 同意]  [❌ 拒绝]                   │
└──────────────────────────────────────────┘

LaunchDetail 的 "Governance" Tab：

- 投票历史列表
- 已通过的提款记录
- 被拒绝的申请及原因
```

---

## 阶段 6：退出机制 + 三段定价 + 代币效用（P4 新增）

```
退出机制 UI（LaunchDetail 的 Governance Tab 内）：

代币持有人可在 30-90 天窗口内检查退出条件：

┌──────────────────────────────────────────┐
│  🚪 退出窗口：剩余 42 天                   │
│                                          │
│  □ 触发条件检查：                          │
│    ✓ 连续 14 天无更新   → 已触发          │
│    ○ 代币 < 发行价 50%  → 未触发          │
│                                          │
│  可赎回金额：35 TON                        │
│  将销毁：6000 代币                         │
│  剩余持有人份额将增大                      │
│                                          │
│  [⚠ 确认退出并销毁代币]                    │
└──────────────────────────────────────────┘

Spark 弹窗的三段式定价展示：

┌──────────────────────────────────┐
│  🔥 Stage 1 早鸟                 │
│  1 TON = 100 代币 + 10% 额外     │
│  剩余额度：8,000 / 10,000 TON    │
│                                  │
│  ── 下一阶段预览 ──               │
│  Stage 2：1 TON = 80 代币        │
│  Stage 3：1 TON = 60 代币        │
│                                  │
│  ① 投多少？[5/10/50/100 TON]     │
│  ② [单人] [组队]                 │
│  ③ [✦ Spark]                    │
└──────────────────────────────────┘

Portfolio 中的代币上市前效用：

代币到账后，上市前的三个入口卡片：

┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 项目内消耗   │ │ Backer Pool │ │ 治理投票     │
│ 调用 AI 服务  │ │ 质押获优先权 │ │ 项目方向决策 │
│ 每次扣 0.1   │ │ 下一 Launch  │ │ 30 天未参与 │
│ 代币         │ │ 优先认购     │ │ 将失去权重   │
│ [使用]       │ │ [质押]       │ │ [投票]       │
└─────────────┘ └─────────────┘ └─────────────┘
```

---

## 补充说明

颜色：主色 #635BFF / 背景 #0A0B14 / 卡片 #121620
正 #22C55E / 负 #EF4444
AI 评分 ≥85 金色 / 70-84 蓝色 / <70 灰色
所有数据先用 mock。API 前缀 /api/v1/。
按阶段顺序生成。

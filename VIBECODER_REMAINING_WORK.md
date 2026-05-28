> [!WARNING]
> FROZEN: Old remaining-work report. Use REMAINING_TASKS.md for active work.
> Registry: [DOCS_FREEZE.md](./DOCS_FREEZE.md)

# VibeCoder 剩余工作计划与文档对齐报告

日期: 2026-05-28 | 基于 VIBECODER_PLAN.md v2.0（最新基准）

---

## 一、当前完成状态

```
P0：可运行基础            ✅ 100% — build 通过、类型检查干净、Fund→Spark 完成
P1A：增长闭环 Mock 版     ✅ 100% — Feed、Spark 弹窗、庆祝、分享、Portfolio
P1B：钱包与 testnet 基础  ✅ 90%  — TonConnect 真实连接 + testnet 余额，$VC Jetton 未部署
P2：病毒引擎              ✅ 100% — 团队 Spark、邀请、成就、TG 通知
P3：Spark 上链            0%   — 全部未开始
P4：发币闭环              0%   — 全部未开始
P5：扩展                  0%   — 全部未开始
```

---

## 二、前端代码改造任务（按优先级）

### 2.1 立即清理（不影响功能）

| # | 任务 | 文件 | 工作量 |
|---|------|------|--------|
| 1 | 删除死代码 `ExplorePage.tsx` | 路由 `/explore` 已永久重定向到 `/feed`，661 行无法访问的代码 | 10 分钟 |
| 2 | 删除 `ProjectDetail.tsx` | 已被 `SparkDetail.tsx` 取代（详情的唯一来源），990 行冗余 | 5 分钟 |
| 3 | 删除 `FundDetailPage.tsx`、`FundPage.tsx`、`CreateFundPage.tsx` | 已重命名为 Spark，确认无残留后删除 | 5 分钟 |

### 2.2 两层命名对齐

| # | 任务 | 说明 | 工作量 |
|---|------|------|--------|
| 4 | Sidebar 菜单「Spark 星火共建」→ 改名为 `Launch` | 符合两层命名：平台层 `Launch` / 用户层 `Spark` | 5 分钟 |
| 5 | 路由 `/spark` → `/launch`，`/spark/:id` → `/launch/:id` | 页面 URL 改为 `/launch` | 1 小时 |

### 2.3 P3 前端功能：治理与 Project Health

| # | 任务 | 说明 | 工作量 |
|---|------|------|--------|
| 6 | 新建 `src/pages/ProjectHealth.tsx` | 公开数据面板 (E)：募资进度、里程碑、代币价格、治理合约余额、待投票列表 | 2 天 |
| 7 | 在 SparkDetail 的 Project Health Tab 中集成投票 UI | 团队提款申请 → 代币持有人投票批准/拒绝 → 平方根权重计算 | 2 天 |
| 8 | Launch 详情页添加 55% 阈值进度线 | 可视化指示 55% 目标（代币部署触发条件） | 1 天 |
| 9 | 添加 30/50/20 资金分配饼图 | Launch 成功后的资金分配可视化 | 0.5 天 |

### 2.4 P4 前端功能：三段定价 + 退出机制 + 代币效用

| # | 任务 | 说明 | 工作量 |
|---|------|------|--------|
| 10 | Spark 弹窗添加三段式定价展示 | Stage 1/2/3 的兑换率、额外奖励、剩余额度 | 1 天 |
| 11 | 新建退出机制 UI | 退出触发条件检查 → 赎回金额计算 → 代币销毁确认 | 2 天 |
| 12 | Portfolio 添加代币上市前效用 | 项目内调用消耗、Backer Pool 质押、治理投票入口 | 2 天 |

---

## 三、后端 + 合约任务

### 3.1 P3：后端骨架 + Launch Campaign 合约

| # | 任务 | 工作量 |
|---|------|--------|
| 13 | 搭建 Worker 后端骨架（Hono + D1） | 2 天 |
| 14 | D1 数据库 Schema（用户、项目、Launch、投票、投资记录） | 1 天 |
| 15 | 编写 Launch Campaign 合约（Tolk）— 三段式定价、55% 阈值、30/50/20 分账、平方根投票 | 3 天 |
| 16 | 编写 Launch Campaign 合约的本地测试 | 2 天 |
| 17 | testnet 部署 + 验证 | 1 天 |
| 18 | 链上索引器（监听合约事件 → D1） | 2 天 |
| 19 | Worker API 路由：项目 CRUD、Launch 状态查询、投票提交 | 2 天 |

### 3.2 P4：Token Launcher + Vesting 合约

| # | 任务 | 工作量 |
|---|------|--------|
| 20 | 编写 Token Launcher 合约 — 55% 触发自动部署标准 TEP-74 | 2 天 |
| 21 | 编写 Vesting 合约 — 里程碑解锁 + Oracle 喂价 + 代币释放 | 2 天 |
| 22 | testnet 部署 + 验证 | 1 天 |
| 23 | Worker API 路由：退出请求、代币分配查询 | 1 天 |

---

## 四、文档对齐任务

五份文档不一致的问题：

| 文档 | 当前状态 | 需要做什么 |
|------|---------|-----------|
| `VIBECODER_PLAN.md` | ✅ v2.0，最新 | 基准文档，无需改动 |
| `VIBECODER_PRODUCT.md` | ✅ 已更新 | 与 PLAN 对齐，确认无误 |
| `VIBECODER_CONTRACTS.md` | ❌ 过时 | **全量重写**——仍用旧命名（Spark Campaign、Vault、委员会），缺少：55% 阈值、30/50/20、平方根投票、LP 池、双源取价 |
| `VIBECODER_FRONTEND_PROMPTS.md` | ❌ 过时 | **更新**——仍用 Fund 命名、无 Project Health 面板、无投票 UI、无退出机制、无三段式定价 |
| `VIBECODER_FOUNDER_PERSPECTIVE.md` | ⚠️ 已整合 | **不再维护**——核心思想已融入 PLAN。顶部加注"已整合至 VIBECODER_PLAN.md"，不再独立更新 |

### 对齐操作

| # | 任务 | 工作量 |
|---|------|--------|
| 24 | 重写 `VIBECODER_CONTRACTS.md`：Launch Campaign（55% 阈值、三阶段、平方根投票、30/50/20） + Token Launcher + Vesting + LP Pool + 双源取价 | 2 天 |
| 25 | 更新 `VIBECODER_FRONTEND_PROMPTS.md`：添加 ProjectHealth 页面提示词、投票 UI、三段式定价、退出机制、代币上市前效用。更新目录结构。 | 1 天 |
| 26 | `VIBECODER_FOUNDER_PERSPECTIVE.md` 顶部加注"已整合，不再独立维护" | 5 分钟 |
| 27 | `VIBECODER_PRODUCT.md` 确认与 PLAN 一致 | 30 分钟 |

---

## 五、推荐执行顺序

```
第 1 周：文档对齐 + 前端清理 + P3 后端骨架
  ├─ 重写 CONTRACTS.md (任务 24)
  ├─ 更新 FRONTEND_PROMPTS.md (任务 25)
  ├─ 标记 FOUNDER_PERSPECTIVE (任务 26)
  ├─ 前端清理 (任务 1-5)
  └─ 搭建 Worker + D1 Schema (任务 13-14)

第 2–3 周：P3 关键合约
  ├─ Launch Campaign 合约编写 + 测试 + testnet 部署 (任务 15-17)
  └─ 链上索引器 + 后端 API (任务 18-19)

第 4 周：P3 前端治理功能
  ├─ Project Health 面板 (任务 6)
  ├─ 投票 UI (任务 7)
  ├─ 55% 阈值指示器 (任务 8)
  └─ 30/50/20 饼图 (任务 9)

第 5–6 周：P4 合约 + 前端
  ├─ Token Launcher + Vesting 合约 (任务 20-22)
  ├─ 三段式定价 UI (任务 10)
  ├─ 退出机制 UI (任务 11)
  ├─ 代币上市前效用 UI (任务 12)
  └─ P4 后端 API (任务 23)

--- P4 完成时，核心闭环完整 ---
```

---

## 六、当前 Sidebar 整理建议

当前 9 个菜单项 → 收敛为 6 个（核心 4 个 + 2 个辅助）：

| 保留 | 名称 | 路由 | 说明 |
|------|------|------|------|
| ✅ | Explore | `/feed` | 发现项目 |
| ✅ | Launch | `/launch` | 当前 `/spark` |
| ✅ | Copilot | `/copilot` | AI 助手 |
| ✅ | Portfolio | `/portfolio` | 我的持仓 |
| — | Settings | `/settings` | 放入 Header 用户菜单 |
| — | Invite | `/invite` | 放在 Header 或 Portfolio 内 |

去掉侧边栏的：Studio（开发者入口放 DevHub）、DevHub（放 Settings 的子页面）、Launchpad（已合并）

---

## 七、总工作量估算

| 阶段 | 工时 |
|------|------|
| 文档对齐 | 3.5 天 |
| 前端清理 + 命名对齐 | 1.5 天 |
| P3 前端（治理 UI） | 5.5 天 |
| P4 前端（定价 + 退出） | 5 天 |
| P3 后端 + 合约 | 13 天 |
| P4 合约 + API | 6 天 |
| **总计** | **~35 天（7 周）** |

若前后端并行、合约与前端可同时推进，实际日历时间约 **5–6 周**。

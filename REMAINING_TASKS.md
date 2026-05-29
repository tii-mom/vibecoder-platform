# VibeCoder 剩余工作计划 v1.0

> 给执行线程。当前项目已上线运营，以下是剩余待完成任务。

---

## 项目环境

| 组件 | 地址 |
|------|------|
| 前端 | `https://app.72h.lol` |
| API | `https://api.72h.lol` |
| GitHub | `https://github.com/tii-mom/vibecoder-platform` |
| .env | `/Users/yudeyou/Desktop/VC/.env`（前端）/ `.env.example`（模板）|
| D1 数据库 | `vibecoder-db-new`（17 张表） |

---

## 一、链上验证（TonCenter RPC 恢复后执行）

目前 TonCenter 测试网节点不稳定（`LITE_SERVER_NOTREADY`），等恢复后验证：

### 任务 1.1：验证 VC 总供应链上数据

```bash
cd /Users/yudeyou/Desktop/VC/contracts && node -e "
const {TonClient,Address}=require('@ton/ton');
(async()=>{
  const c=new TonClient({endpoint:'https://testnet.toncenter.com/api/v2/jsonRPC?api_key=061f4bf26320172112a42b870c02de9a235a795d52960bd80c3fbcdfa8d08891'});
  const r=await c.runMethod(Address.parse('UQDwO6ai0zr0UVekU-NIqI_eCTKCICrkt2zGMnAzNJrk58dO'),'getJettonData');
  console.log('Total Supply:', r.stack.readBigNumber().toString());
  console.log('Mintable:', r.stack.readBigNumber().toString());
  console.log('Admin:', r.stack.readAddressOpt()?.toString({bounceable:false})||'(burned)');
})();
"
```

预期输出：`Total Supply: 900000000`（900M），`Mintable: -1`（true），`Admin: (burned)`。

### 任务 1.2：验证 Launch Campaign 55% 触发

部署的 Campaign 地址：`UQDbbI9HYci2ClRsSKhchBywAqRhBAQKfiYsAP5v-swi4aHi`

已发送 2 笔 Spark（30 TON + 40 TON = 70 TON > 55 TON 阈值）。验证：

```bash
cd /Users/yudeyou/Desktop/VC/contracts && node -e "
const {TonClient,Address}=require('@ton/ton');
(async()=>{
  const c=new TonClient({endpoint:'https://testnet.toncenter.com/api/v2/jsonRPC?api_key=061f4bf26320172112a42b870c02de9a235a795d52960bd80c3fbcdfa8d08891'});
  const r=await c.runMethod(Address.parse('UQDbbI9HYci2ClRsSKhchBywAqRhBAQKfiYsAP5v-swi4aHi'),'getCampaignData');
  console.log('Raised:', Number(r.stack.readBigNumber())/1e9,'TON');
  r.stack.readBigNumber();r.stack.readBigNumber();r.stack.readBigNumber();
  console.log('Token Deployed:', r.stack.readBoolean());
})();
"
```

预期：`Token Deployed: true`，`Raised: ~70 TON`。

---

## 二、BountyPage 质押 UI 完善

### 背景

BountyPage.tsx（`vc/src/pages/BountyPage.tsx`，217 行）当前有赏金列表和领取弹窗，但缺少 VC 质押面板。需要添加：

### 任务 2.1：添加质押 UI

在 BountyPage 的"我的收益"卡片后面添加质押区块：

```
┌──────────────────────────────────────────┐
│ 🔒 VC 质押 · 解锁代币赏金资格            │
│                                          │
│ ⭐ 平台项目方  ⭐⭐ TON外部  ⭐⭐⭐ 非TON  │
│   1万 VC        10万 VC       50万 VC    │
│   锁 6 月       锁 6 月       锁 6 月     │
│                                          │
│ [选择数量 ▼]  [质押 VC]                  │
│                                          │
│ 已质押: 10万 VC · 解锁日 2026-11-29      │
└──────────────────────────────────────────┘
```

**API 端点**（已有，直接调）：

| 端点 | 方法 | 参数 |
|------|------|------|
| `/api/v1/bounty/stake/status?user_id=X` | GET | — |
| `/api/v1/bounty/stake` | POST | `{ user_id, creator_tier, vc_amount }` |

**参考代码**：在第 4 个 Card 后添加。需要 `useState` 管理 `stakeAmount`、`stakeStatus`、`stakingLoading`。

---

## 三、自动化规则引擎联调

### 背景

Worker API 已有 3 个规则端点（GET/POST/PUT `/api/v1/automation/rules`），前端 CopilotPage 已有自动化面板 UI。需要联调——让前端的创建/切换操作真正调用 API。

### 任务 3.1：规则 CRUD 接入

CopilotPage.tsx 中的 Auto-Spark / Auto-Vote / Auto-Exit 开关和参数，改为调用 API：

```ts
// 创建规则
fetch('/api/v1/automation/rules', {
  method: 'POST',
  body: JSON.stringify({
    user_id: '...',
    rule_type: 'AUTO_SPARK',
    condition_json: { minScore: 85, maxAmount: 10 },
    action_json: { action: 'SPARK', amount: 10 },
  })
});

// 切换启用/禁用
fetch(`/api/v1/automation/rules/${ruleId}`, {
  method: 'PUT',
  body: JSON.stringify({ enabled: 1 })
});
```

### 任务 3.2：D1 表确认

`automation_rules` 表已在 migration `0003_agentic.sql` 中创建。检查表结构：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 规则 ID |
| user_id | TEXT | 用户 |
| rule_type | TEXT | AUTO_SPARK/AUTO_VOTE/AUTO_EXIT/MONITOR |
| condition_json | TEXT | JSON 条件 |
| action_json | TEXT | JSON 动作 |
| enabled | INTEGER | 0/1 |

---

## 四、Acton 工具链迁移（⚠️ 需特别小心）

### 背景

之前尝试 Acton 迁移时出现以下问题：

> **问题 1**：Blueprint Tolk 和 Acton Tolk 语法不完全兼容
> - `get` 需改为 `get fun`
> - `getContractData()` → `contract.getData()`
> - `sendMessage()` / `now()` / `isSliceBitsEqual()` / `addressIsNone()` / `cellHash()` 需要 compat asm 包装
> - `if` 单行语句需加 `{ }` 大括号
> - `sDictGet` 不接受 int key，必须传 slice key
> - `parseStandardAddress` 未定义

> **问题 2**：之前用 perl/sed 批量替换时产生了不可逆的代码破坏
> - 使用正则 `s/\.assertEndOfSlice/` 替换导致函数名粘连
> - 多次反复修改覆盖，最终无法恢复

### ⚠️ 关键约束

**1. 不要删除 Blueprint**
保留 `package.json`、`tsconfig.json`、`wrappers/`、`node_modules/`。TypeScript 测试仍然需要 Jest + Sandbox。

**2. Acton 作为额外工具链**
只在 `contracts/` 目录加一个 `Acton.toml` 配置文件。用 `acton build` 验证编译，用 `npm test` 跑测试。

**3. 逐步迁移，逐文件验证**
每次只改 1 个合约，改完立刻 `acton build` 验证通过 → 提交 git → 再改下一个。

### 官方文档

- Acton 安装：https://ton-blockchain.github.io/acton/docs/installation
- 快速开始：https://ton-blockchain.github.io/acton/docs/quickstart
- API 参考：https://ton-blockchain.github.io/acton/docs/reference
- GitHub：https://github.com/ton-blockchain/acton

### 任务 4.1：安装 Acton

```bash
curl -LsSf https://github.com/ton-blockchain/acton/releases/latest/download/acton-installer.sh | sh
acton --version
```

### 任务 4.2：初始化

```bash
cd /Users/yudeyou/Desktop/VC/contracts
acton init
```

生成 `Acton.toml`。**不要删除任何现有文件。**

### 任务 4.3：逐文件迁移

**顺序**（从简单到复杂）：

```
1. token_launcher.tolk     (49 行，最简单)
2. strategic.tolk           (61 行)
3. project_token.tolk       (102 行)
4. project_token_wallet.tolk (122 行)
5. vc_jetton.tolk           (117 行)
6. early_subscription.tolk  (114 行)
7. fund.tolk                (155 行)
8. launch_fee.tolk          (148 行)
9. vesting.tolk             (130 行)
10. launch_campaign.tolk    (364 行，最后改)
```

### 每个文件需要的修改模式

```tolk
// 顶部添加 compat helpers（放在 import 语句后）
fun cellHashCompat(c: cell): int asm "HASHCU";
fun addressIsNone(a: slice): bool asm "ISNULL";
fun sendMsg(msg: cell, mode: int): void asm "SENDRAWMSG";
fun nowTs(): int asm "NOW";
fun eqBits(a: slice, b: slice): bool asm "SDEQ";
fun bounced(f: int): bool asm "1 PUSHINT AND";
```

然后替换调用：
```
getContractData()  → contract.getData()
setContractData(   → contract.setData(
getMyAddress()     → contract.getAddress()
get                → get fun
cellHash(          → cellHashCompat(
sendMessage(       → sendMsg(
now()              → nowTs()
isSliceBitsEqual(  → eqBits(
isMessageBounced(  → bounced(
addressIsNone(     → addressIsNone(
```

`.assertEndOfSlice()` → 保持不变，Tolk 原生支持

### 任务 4.4：验证

```bash
# 每改完一个文件
acton build

# 全部改完后
npm test
```

**预期**：`acton build` 无错误，`npm test` 5/5 通过。

---

## 五、前端优化（可选）

### 任务 5.1：Chunk 分包

前端 build 时有 chunk 过大的 warning。在 `vite.config.ts` 添加分包配置：

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        charts: ['recharts'],
        ton: ['@tonconnect/ui-react'],
      }
    }
  }
}
```

### 任务 5.2：部署前端

```bash
cd /Users/yudeyou/Desktop/VC/vc
npx vite build
npx wrangler pages deploy dist --project-name vibecoder --branch main
```

---

## 六、主网准备（P5 阶段）

| # | 任务 | 说明 |
|---|------|------|
| 6.1 | 安全审计 | 合约代码 + 前端 + Worker |
| 6.2 | VC Jetton 主网部署 | 用主网助记词重新部署 |
| 6.3 | Fund/Strategic/EarlySub/LaunchFee 主网部署 | |
| 6.4 | Token Launcher 主网部署 | |
| 6.5 | 合约地址更新主网 D1 | |
| 6.6 | 法务合规审查 | |

---

## 执行顺序

```
1. 链上验证（1.1 → 1.2，等 RPC 恢复后 5 分钟）
2. BountyPage 质押 UI（2.1，1 小时）
3. 自动化规则联调（3.1 → 3.2，2 小时）
4. Acton 迁移（4.1 → 4.4，3-4 小时，逐文件迁移）
5. 前端优化（5.1 → 5.2，30 分钟）
6. 主网准备（6.x，后续）
```

---

## ⚠️ 严禁

- **不要删除 Blueprint 文件**（package.json / node_modules / wrappers / tsconfig.json）
- **不要一次性修改所有合约**（逐文件改 + 逐文件验证）
- **不要用 sed/perl 批量替换**（容易产生不可逆错误，逐行手动改）
- **不要在 TonCenter 节点故障时执行链上操作**（等 RPC 恢复）

---

## 参考

- `CONTRACTS.md` — 合约设计文档 v2.0
- `VIBECODER_PHASE_PLAN.md` — 阶段执行计划
- `contracts/tests/` — 现有测试
- `worker/src/index.ts` — API 端点
- `vc/src/store/` — Zustand stores

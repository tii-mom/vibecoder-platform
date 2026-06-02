# VibeCoder 开发执行规则

> 依据文档：`VIBECODER_UPGRADE_PROPOSAL.md`（唯一产品与架构依据）
> 适用环境：`vc/` 前端 + `worker/` 后端 + `contracts/` 合约

## 执行纪律

1. **每次只做一个垂直切片**，不一次改全项目。
2. **修改前必须列出**：会改的文件、原因、验收标准。
3. 不允许引入和本任务无关的大范围改动。

## 数据规范

4. **金额统一 INTEGER nano 单位**。禁止使用 REAL。字段命名后缀 `_nano`（如 `reward_vc_nano`、`target_amount_nano`）。
5. **百分比/比例** 存 INTEGER（百分数×100，如 35% → 3500）。
6. **项目编号/集火编号** 必须稳定、唯一、不可复用。用 `Date.now().toString(36) + random` 生成并按唯一索引重试防冲突。
7. **TON 代币与合约方法命名规则**：
   - 合约在开发代币（Jetton）时，必须提供符合 TEP-74 规范下的蛇形命名（snake_case）只读方法：`get_jetton_data`、`get_wallet_address` 以及钱包合约的 `get_wallet_data`。如因历史调用兼容需要保留驼峰命名（camelCase），必须同时暴露两套命名方法。
8. **代币铸造与发放精度规则**：
   - 在部署和测试网/主网代币发行脚本中，涉及代币发送和铸造（Mint）的 coins 字段，必须严格将人类可读的数量乘以精度因子（如精度为 9 则乘以 `1_000_000_000`），不允许将未按精度因子缩放的原始数字作为面值直接填入链上交互数据。

## 数据安全

7. **D1 migration 规则**：
   - 不允许 `ALTER TABLE ADD COLUMN UNIQUE`。拆分：先 ADD COLUMN → backfill → CREATE UNIQUE INDEX。
   - 不允许在生产 migration 里 seed mock 数据。
   - 所有金额字段用 INTEGER，旧表已有的 REAL 字段暂不改动（历史兼容），新增字段一律 INTEGER。
8. **不允许写"已自动验证"但实际只是 pending/mock**。状态必须如实反映：
   - UID 验证：`PENDING_AUTO → NEEDS_MANUAL_REVIEW / VERIFIED / REJECTED`
   - 链上入账：未实现之前不能写成验证通过。

## 服务端安全

9. **Telegram Auth**：
   - Bot token 必须只从 `c.env.TELEGRAM_BOT_TOKEN` 读取，不接受请求体传入。
   - 必须校验 `auth_date` 时效（≤300秒）。
   - hash 比较必须用常量时间（`timingSafeEqual`）。
   - TG 登录只建立 telegram session，不能自动 `connectWallet()`。
10. **API 字段必须对照真实 schema**。禁止使用不存在的列名（如 `agent_name` 实际是 `name`）。
11. **管理员接口** 必须有 admin wallet 白名单校验。
12. **速率限制** 所有可被滥用端点（OnRamp UID、Bounty submit）必须有限频。

## 每次完成的验证清单

必须全部通过才算完成：

| # | 命令 | 目录 |
|---|------|------|
| 1 | D1 migrations 从 0001 到最新完整跑通 | `worker/` (手动执行 SQL 或 `wrangler d1 execute`) |
| 2 | `npx tsc --noEmit` | `worker/` |
| 3 | `npx tsc --noEmit` | `vc/` |
| 4 | `npx vite build` | `vc/` |
| 5 | API 字段与真实 schema 对照 | 逐字段检查 |

## 最终报告模板

每完成一个垂直切片，报告格式：

```
### 切片 N：[任务名]

**改动文件**：
- `path/file.ts` — 原因

**验收标准**：
- [ ] tsc worker
- [ ] tsc vc
- [ ] vite build
- [ ] migration 完整跑通

**未完成/仍是 mock 的部分**：
- xxx（如实列出）

**发现但未修的问题**：
- xxx（如有）
```

## 禁止事项速查

| 禁止 | 替代方案 |
|------|---------|
| `ADD COLUMN ... UNIQUE` | ADD COLUMN + backfill + CREATE UNIQUE INDEX |
| REAL 金额 | INTEGER nano |
| migration seed data | dev seed 脚本或 mock 分支 |
| "已自动验证" pending | 如实标注 PENDING_AUTO |
| botToken 从请求体取 | c.env.TELEGRAM_BOT_TOKEN |
| 不存在的列名 | 对照真实 schema |
| 一次改全项目 | 一个垂直切片 |
| 仅暴露 camelCase get-methods | 同时暴露标准 snake_case get-methods (`get_jetton_data` 等) |
| 直接填入人类面额进行铸造/转账 | 必须乘以精度因子（如 $10^9$）使用 nano 聪作为基本单位 |

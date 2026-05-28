> [!WARNING]
> FROZEN: Point-in-time audit report. Findings may be remediated or stale; re-audit before using as current risk register.
> Registry: [DOCS_FREEZE.md](./DOCS_FREEZE.md)

# VibeCoder Security Audit Report

日期: 2026-05-29
范围: `contracts/`, `worker/`, `vc/`, 以及审计计划 `security_audit_plan.md` 覆盖的 TON/Tolk 合约、Cloudflare Worker + D1、Agentic Wallet、前端客户端安全。

## 执行摘要

当前代码不建议进入生产或主网资金环境。最高优先级风险集中在:

- 真实密钥/助记词已经出现在 `.env.example`、`worker/wrangler.toml`、`worker/src/index.ts`。
- 后端 API 没有认证上下文，直接信任请求中的 `user_id`，自动化规则和赏金余额存在 IDOR/越权。
- 质押接口允许 mock tx 绕过链上验证，且非 mock tx 只验证交易成功，不验证收款方、金额、token、发送方和唯一性原子约束。
- 多个合约忽略 bounced message，且在外发消息前/后更新本地状态但没有补偿逻辑，资金和账本容易失配。
- `LaunchCampaign` 达到阈值时单交易遍历所有投资者并发 mint，存在 OOG 锁死或阈值触发失败风险。
- `Fund` 合约空 body 分支在未 `loadData()` 的情况下 `saveData()`，可能在部署或普通空消息时破坏持久化状态。
- Agentic Wallet 目前没有可审计的 KMS/加密/限额/白名单实现，不能满足托管钱包生产安全要求。

## P0 Findings

### P0-1: 密钥、助记词、机器人 Token 泄露在仓库文件中

证据:

- `.env.example:11`, `.env.example:17`, `.env.example:24`, `.env.example:30`, `.env.example:37`
- `worker/wrangler.toml:13`
- `worker/src/index.ts:26`

影响:

- DeepSeek API key、TonCenter API key、Telegram bot token、Cloudflare API token、部署助记词均出现为真实值或真实形态。
- 一旦提交或同步到远端，必须视为已泄露。

建议:

- 立即轮换所有上述凭据和部署钱包助记词，废弃对应钱包或迁移资产。
- `.env.example` 只保留占位符；Worker secrets 使用 `wrangler secret put`。
- 删除 `worker/src/index.ts` 中硬编码 Telegram token，改为 `env.TELEGRAM_BOT_TOKEN`。
- 若这些值已进入 git 历史，执行历史清理并确认远端、CI 日志和部署记录无残留。

### P0-2: API 无身份认证，`user_id` 可被任意伪造

证据:

- `worker/src/index.ts:541-548` 通过 query `user_id` 查询自动化规则。
- `worker/src/index.ts:555-564` 通过 body `user_id` 创建规则。
- `worker/src/index.ts:571-578` 更新规则只按 `id`，没有校验所属 `user_id`。
- `worker/src/index.ts:527-535`, `worker/src/index.ts:585-592` 可按任意 `user_id` 或 `wallet_id` 查询 Agentic Wallet/日志。
- 前端固定使用 `demo_user`: `vc/src/pages/CopilotPage.tsx:51`, `vc/src/pages/CopilotPage.tsx:92`, `vc/src/pages/CopilotPage.tsx:127`, `vc/src/pages/BountyPage.tsx:52`, `vc/src/pages/BountyPage.tsx:70`。

影响:

- 任意客户端可以读取、创建、启停他人的自动化规则。
- 任意客户端可以查询他人的托管钱包状态和日志。
- 如果自动化执行上线，该问题会直接变成资产操作越权。

建议:

- 后端必须验证 TonConnect `ton_proof`，从已验证会话/JWT 中派生用户身份。
- 所有 CRUD 查询条件必须包含认证用户: `WHERE id = ? AND user_id = ?`。
- 移除前端 `demo_user`，所有敏感请求携带后端签发的短期 token。

### P0-3: `/api/v1/bounty/stake` 可绕过链上质押验证，且 tx 去重不是原子安全

证据:

- `worker/src/index.ts:410` 将 `mock*` 或长度小于 20 的 `tx_hash` 视为 mock，跳过链上验证。
- `worker/src/index.ts:412-415` 先查重，`worker/src/index.ts:439-446` 后写入，存在 TOCTOU。
- `worker/src/index.ts:440-441` 使用 `INSERT OR REPLACE`，重复主键不会失败而是覆盖。
- `worker/src/index.ts:421-436` 只检查交易存在且成功，未验证转入合约、token master、金额、发送方、memo/nonce、确认数。

影响:

- 生产环境若保留 mock 分支，攻击者可免费伪造质押资格。
- 同一 `tx_hash` 可在并发/覆盖场景下污染或替换质押记录。
- 任意成功交易 hash 可能被拿来冒充质押。

建议:

- 生产禁用 mock 分支，或仅在显式 dev 环境开放。
- 数据库使用 plain `INSERT` + `id = tx_hash` 唯一约束，依赖数据库原子失败阻断重放。
- 验证链上交易的 sender、recipient、token、amount、success、lt/hash、confirmations，并绑定到一次性 nonce。

### P0-4: Fund 合约空消息会在未加载状态下保存，可能破坏合约数据

证据:

- `contracts/contracts/platform/token-system/fund/fund.tolk:59-63`

问题:

- 空 body 分支直接 `accumulatedTon += msgValue; saveData(); return;`，但没有先调用 `loadData()`。
- `saveData()` 会写入 `adminAddr`、`vcMaster`、`vcWalletCode`、`myWallet`、dict 等全局变量。

影响:

- 部署消息或普通空消息可能把持久化配置写成默认/未初始化值，导致 admin、wallet、dict 状态损坏。

建议:

- 空 body 分支也必须先 `loadData()`。
- 添加 Fund 部署和空消息回归测试，断言 admin/master/wallet/dict 不变。

### P0-5: 多个合约忽略 bounce，状态补偿缺失

证据:

- `LaunchCampaign`: bounce 直接 return `launch_campaign.tolk:149`; refund 先清账再转账 `188-191`; settle 扣 `govRemaining` 后转账 `245-254`; exit 清账、扣资金、转账/燃烧 `287-299`。
- `ProjectToken`: bounce return `project_token.tolk:25-26`; mint 发消息后增加 `totalSupply` `39-41`。
- `ProjectTokenWallet`: bounce return `project_token_wallet.tolk:23-24`; transfer/burn 先扣余额 `33-39`, `59-65`。
- `EarlySubscription`: bounce return `early_subscription.tolk:52-53`; 记录订阅并增加 `totalSub` 后发送 VC `68-76`。
- `Fund`: bounce return `fund.tolk:65-67`; TON 提现扣账 `115-118`; token 提现扣账 `132-143`。

影响:

- 下游合约不存在、gas 不足、消息 bounce 时，源合约本地状态不会回滚。
- 可能导致用户记录清零但未退款、供应量增加但钱包未收到、合约账本与实际余额不一致。

建议:

- 为每类外发动作设计 pending 状态和 query id 映射。
- bounce handler 解析原始 op/query id，恢复投资者余额、供应量、govRemaining、订阅/质押账本。
- 对不能补偿的操作采用 pull-withdraw 模式，避免 push 失败造成不可恢复状态。

## P1 Findings

### P1-1: `LaunchCampaign.deployContracts()` 单交易遍历全部投资者，存在 OOG 和阈值锁死风险

证据:

- `contracts/contracts/launch/launch-campaign/launch_campaign.tolk:94-145`
- 投资者遍历和每人 mint: `104-124`
- 测试中也承认 Sandbox 消息顺序/部署触发会导致第二次 spark 可能回退: `contracts/tests/launch/LaunchCampaign.spec.ts:76-80`

影响:

- 投资者数量上升后，阈值触发交易可能超过 gas 上限。
- 部署、mint、分钱都在同一函数内，任何一步失败都可能使 campaign 卡在不可预期状态。

建议:

- 拆成 `startDeploy()`、`mintBatch(startAfter, limit)`、`finalizeDistribution()`。
- 存储 mint cursor，限制单次处理数量。
- 为部署完成和 mint 完成建立状态机，不在 master 未确认前连续 mint。

### P1-2: 异步部署状态过早置为成功

证据:

- `launch_campaign.tolk:98-102` 发送 token master 部署消息后立即设置 `deployed = true; status = STATUS_SUCCESS`。
- 随后立刻向新 token master 发 mint 消息: `117-121`, `137-141`。

影响:

- TON 异步模型下，部署消息失败或延迟时，campaign 已进入成功态，后续 mint 可能失败并 bounce，且 bounce 被忽略。

建议:

- 增加 `DEPLOYING` 状态。
- 等待 token master 回调/确认后再开放 mint 和治理。
- bounce 时回滚到 `FUNDING` 或进入 `DEPLOY_FAILED` 可恢复状态。

### P1-3: LaunchFee/TokenLauncher/Fund 存在访问控制或协议认证缺口

证据:

- `TokenLauncher` 任意 sender 可触发部署，且未校验 msgValue 是否覆盖 0.05 TON 部署成本: `token_launcher.tolk:19-23`。
- `LaunchFee` 的 `OP_STAKE`/`OP_FEE` 没有验证 admin、VC wallet 或真实 Jetton transfer notification: `launch_fee.tolk:66-97`。
- `Fund` 的 op `0` 可由任意 sender 声明 token amount，未验证标准 `transfer_notification` 或 sender 是本合约 wallet: `fund.tolk:71-79`。

影响:

- TokenLauncher 若有余额，可能被无成本消耗。
- LaunchFee 可被任意人伪造项目质押/付费状态。
- Fund 账本可被伪造 token 入账污染。

建议:

- TokenLauncher 增加 admin/fee 或至少 `msgValue` 下限。
- LaunchFee/Fund 只接受标准 Jetton wallet 的 `transfer_notification`，并校验 sender 等于预期 wallet 地址。
- 对平台操作加 admin gate 或显式 public factory 费率机制。

### P1-4: SQL 注入总体通过，但金额字段和多步骤更新存在完整性风险

证据:

- Worker SQL 用户输入均通过 `.prepare(...).bind(...)`，未发现用户输入字符串拼 SQL。
- 金额字段大量使用 `REAL`: `worker/migrations/0001_schema.sql:15-23`, `56-58`, `66-69`, `80`, `90-91`; `worker/migrations/0002_bounty.sql:14`, `18`, `22`, `34`, `47`。
- 赏金提交先查重再插入/更新/加余额，多语句无事务: `worker/src/index.ts:365-393`。

影响:

- 浮点金额会产生精度误差，资产/奖励账本不可审计。
- 并发提交可能突破 `total_slots` 或重复奖励。

建议:

- 金额统一用整数最小单位字符串或 INTEGER。
- 为 `(task_id, user_id)` 增加唯一索引。
- 用事务/条件更新: `UPDATE ... SET completed_slots = completed_slots + 1 WHERE id = ? AND completed_slots < total_slots`。

### P1-5: Agentic Wallet 没有生产级密钥、限额、白名单实现

证据:

- schema 只存 `operator_key_hash`，没有 encrypted key/nonce/kms metadata: `worker/migrations/0003_agentic.sql:4-13`。
- `executeAgentAction` 接受 `TRANSFER`，返回 mock tx，并用 `Math.random()`: `worker/src/services/agentic.ts:31-39`。
- 自动化规则只判断本地 JSON 条件，没有链上白名单/每日限额/单笔限额: `worker/src/services/automation.ts:14-40`。

影响:

- 无法证明私钥没有明文存储，也无法证明运行时签名生命周期安全。
- 一旦接入真实签名，规则可被配置为越权或超额操作。

建议:

- 私钥不入 D1；使用 KMS/HSM 或外部托管签名服务。
- 若必须加密存储，使用 AES-256-GCM，密钥来自 KMS，存储 key version、nonce、tag。
- 为每个 wallet 强制单笔/每日额度、合约白名单、动作白名单、审计日志和用户可撤销授权。

### P1-6: 前端和后端均未实现 TonConnect `ton_proof` 身份验证

证据:

- `vc/src/components/TonConnectSync.tsx:6-15` 只同步地址。
- `vc/src/store/userStore.ts:18-28` 从 localStorage 恢复连接态。
- `rg` 未发现 `ton_proof` / nonce / domain / timestamp 校验代码。

影响:

- 客户端地址和 localStorage 都不能作为身份凭证。
- 所有以 `user_id`/address 控制的后端操作均可被伪造。

建议:

- 后端提供 nonce，前端 TonConnect 请求 proof，后端验证 domain、timestamp、payload nonce、signature 和 wallet address。
- 后端签发短期 session token，后续 API 不再接受 body/query 中的 `user_id` 作为权限来源。

## P2 Findings

### P2-1: 前端无明显 `dangerouslySetInnerHTML`，但外链打开缺少协议白名单和 noopener

证据:

- 未发现 `dangerouslySetInnerHTML`、Markdown renderer 或 `innerHTML`。
- 项目描述、评论、提案用途通过 JSX 文本渲染，例如 `vc/src/pages/LaunchDetail.tsx:704`, `1204`, `1876`，React 默认会转义。
- 但赏金任务 URL 将来会来自 API `target_url`: `worker/src/index.ts:310-340`，前端直接 `window.open(selectedTask.url, '_blank')`: `vc/src/pages/BountyPage.tsx:311`。

影响:

- 当前 XSS 面较低。
- 若 API 任务 URL 可由用户创建，`javascript:`/恶意协议或 tabnabbing 仍可能成为客户端风险。

建议:

- 只允许 `https:`、内部 hash route、明确白名单域名。
- `window.open(url, '_blank', 'noopener,noreferrer')`，并把 opener 置空。
- 若未来加入 Markdown，必须使用 sanitizer 并禁用 raw HTML。

### P2-2: Worker 配置不符合当前 Cloudflare 最佳实践

证据:

- `worker/wrangler.toml:3` compatibility date 是 `2024-02-22`。
- 未配置 `nodejs_compat`、observability。
- `worker/src/index.ts:4-6` 手写 `Bindings`，未使用 `wrangler types` 生成。

参考:

- Cloudflare Workers Best Practices 当前建议新项目使用当天 compatibility date、启用 `nodejs_compat`、用 `wrangler types` 生成 Env、密钥不要出现在 source/config 中。

建议:

- 更新 compatibility date 前先跑完整回归。
- 生成 `worker-configuration.d.ts` 并移除手写 Env。
- 将非秘密配置留在 config，秘密全部迁移到 Wrangler secrets。

### P2-3: 安全敏感 ID 使用 `Date.now()` / `Math.random()`

证据:

- Worker task/submission/rule/wallet id: `worker/src/index.ts:332`, `372`, `516`, `560`。
- Agentic mock tx hash: `worker/src/services/agentic.ts:38`。

影响:

- ID 可预测，容易枚举、冲突或被并发覆盖。

建议:

- 使用 `crypto.randomUUID()`。
- 任何 token、nonce、proof payload 使用 Web Crypto 随机数。

## 依赖审计

命令:

- `npm audit --json` in `worker/`
- `npm audit --json` in `vc/`
- `npm audit --json` in `contracts/`

结果:

- `worker/`: 5 total, 1 high, 4 moderate。主要来自旧 `wrangler` -> `miniflare` -> `undici/ws/esbuild`，fix 建议升级 `wrangler` 到 4.x，属于 semver major。
- `vc/`: 4 high。主要来自 `@telegram-apps/sdk` 依赖链中的 `valibot` ReDoS，audit 建议降/切到修复版本线，需要人工确认 SDK API 兼容性。
- `contracts/`: 7 total, 1 critical, 6 high。`protobufjs` critical 来自 `@ton/blueprint`/`@tact-lang/compiler` 依赖链，部分无自动修复；`@ton/ton` 通过 axios 有 high 风险，audit 建议版本调整但为 semver major。

建议:

- 先锁定是否这些包进入生产 runtime。合约工具链多为 dev/deploy 依赖，但 deploy 环境仍需修。
- 建立 CI `npm audit --omit=dev` 和完整 dev audit 两档门禁。
- 对无 fix 的工具链漏洞，用隔离构建环境、最小网络权限、只处理可信合约源码作为临时缓解。

## 验证结果

- `worker`: `npm run typecheck` 通过。
- `vc`: `npm run lint` (`tsc --noEmit`) 通过。
- `contracts`: `npm test -- --runInBand` 通过，2 suites / 6 tests passed。
- `contracts`: `npm run typecheck` 失败，缺少多组隐式 `@types/*`，包括 `body-parser`, `chai`, `express`, `react`, `trusted-types` 等。
- Cloudflare current reference checked: `@cloudflare/workers-types@4.20260529.1` 可获取；`wrangler types --help` 可用。

## 审计计划逐项状态

- 1.1 异步调用重入/竞争: 未通过。Campaign 过早成功、连续异步 mint。
- 1.2 Bounce 覆盖: 未通过。多个合约直接忽略 bounce。
- 1.3 访问控制/信任边界: 未通过。LaunchFee/TokenLauncher/Fund/Worker API 均有缺口。
- 1.4 循环/Gas: 未通过。Campaign 投资者遍历未分页。
- 1.5 序列化边界: 部分通过。主存储读写大多对齐，但 Fund token 入账协议与 Jetton 标准 notification 不对齐。
- 2.1 tx_hash 去重/防重放: 未通过。mock 绕过、非原子去重、链上校验不足。
- 2.2 API 鉴权/IDOR: 未通过。无认证上下文。
- 2.3 SQL 注入/防篡改: SQL 注入未发现；资产字段精度和事务完整性未通过。
- 3.1 私钥存储: 未通过生产要求。当前无真实实现，无法证明 KMS/加密。
- 3.2 运行时解密: 未通过生产要求。无真实签名生命周期。
- 3.3 限额/白名单: 未通过。无强制限额和 whitelist。
- 4.1 TonConnect 签名: 未通过。无 `ton_proof`。
- 4.2 XSS: 当前 JSX 文本渲染基本通过；外链协议/Tabnabbing 和未来 Markdown 需要补强。

## 建议修复顺序

1. 立即轮换并移除所有泄露凭据，冻结相关部署钱包。
2. 后端加 TonConnect proof 验证和认证中间件，修复 `automation/rules`, `agentic/*`, `bounty/*` 的 IDOR。
3. 禁用生产 mock stake，重写链上质押验证和数据库唯一插入。
4. 修复 Fund 空消息数据破坏问题，并补测试。
5. 为所有合约外发消息设计 pending/bounce 补偿状态机。
6. 将 Campaign 部署/mint/分钱改为分页状态机。
7. 修复 LaunchFee/Fund 的 Jetton notification 认证，以及 TokenLauncher 访问/付费模型。
8. 处理依赖漏洞和 `contracts` typecheck 失败。
9. 前端接入后端认证 session，移除 `demo_user`，补 URL allowlist。

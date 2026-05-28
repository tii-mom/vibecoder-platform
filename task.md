> [!WARNING]
> FROZEN: Historical completed checklist. Use IMPLEMENTATION_STATUS.md for current status.
> Registry: [DOCS_FREEZE.md](./DOCS_FREEZE.md)

# VibeCoder 升级剩余任务执行清单 (task.md)

- [x] **切片 1 (Phase 0): Jetton / Launch 合约资金路径审计报告**
  - [x] 审计 `launch_campaign.tolk`, `project_token.tolk`, `project_token_wallet.tolk`, `token_launcher.tolk`, `vesting.tolk` 资金分配、释放、退款、退出路径。
  - [x] 确认审计无漏洞，无需修改 Tolk 代码。

- [x] **切片 2 (Phase 0): TonConnect Proof 校验加固与权限防护**
  - [x] 校验 Manifest 域名，在非开发环境限制 domain 必须为 `app.72h.lol`。
  - [x] 实现防重放，校验并消费 D1 nonce。
  - [x] 校验 proof.timestamp 时间窗口在 900 秒内。
  - [x] 检查并移除生产环境硬编码的 admin 钱包地址，限制生产中使用 `c.env.ADMIN_WALLETS`，开发模式保留 fallback 选项。
  - [x] 新建并引入 `admin_audit_logs` 审计日志。

- [x] **切片 3 (Phase 0): 资金精度专项迁移 (REAL -> INTEGER nano)**
  - [x] 编写并运行迁移文件 `0009_precision_full_migration.sql`，添加 `*_nano` (INTEGER) 字段。
  - [x] 编写脚本进行存量数据 backfill。
  - [x] 替换 Worker 中全部 launches 详情、spark 投资、提案提交、收益、质押的金额处理为 `*_nano` integer。
  - [x] 重构前端展示的金额转换（输入乘以 1e9，展示除以 1e9）。

- [x] **切片 4 (Phase 0 + Phase 1): Bounty 刷 VC 风控与 BountyPage 降级**
  - [x] 限制单笔任务自定义 VC 奖励不超过 100 VC。
  - [x] 限制 24h 内单个钱包提交 Bounty 任务的总数（最多 10 次）。
  - [x] 对 EXCHANGE_REG 提交 of `exchangeUid` 和 `screenshotUrl` 进行输入格式正则校验，防止注入 and 恶意刷单，状态保持 `PENDING`。
  - [x] BountyPage 界面改版，降级截图为申诉途径，与 UID 自动验证状态打通。

- [x] **切片 5 (Phase 1): OnRamp UID 自动验证与链上入账验证闭环**
  - [x] 对接模拟交易所 Affiliate API 进行 UID 归因校验。
  - [x] 校验 UID 绑定钱包是否有来自交易所热钱包的入账。
  - [x] 验证失败转为 `NEEDS_MANUAL_REVIEW`，人工处理申诉。

- [x] **切片 6 (Phase 1): Spark 乐观 UI 与 JWT Helper 统一**
  - [x] 前端 `sparkStore` 添加 `syncStatus` 并对接 UI。
  - [x] 统一 JWT 读写 Helper (`getWalletJwt`, `getReadonlyJwt`)，全面清除 localStorage 直接读写。

- [x] **切片 7 (Phase 2): 组队集火 Squad 前端 UI 整合与拦截**
  - [x] 在 `LaunchDetail.tsx` 中拦截 `LifecycleEmissionCard` 的 `investInProject` 属性，加入 squad 链接拦截。
  - [x] 前端集成组队集火 UI 面板（编号、加入、进度、剩余时间、分享链接）。

- [x] **切片 8 (Phase 2): Stars 支付桥微服务隔离架构与对账闭环**
  - [x] 编写并部署独立的 `vibecoder-signer` 签名微服务。
  - [x] 主服务增加 `SIGNER_SERVICE` 绑定，实现 `POST /api/v1/payment/stars-callback` 路由与验签幂等逻辑。
  - [x] 新建并运行 `0010_stars_payment.sql` D1 数据库账务表迁移。
  - [x] 对接/模拟微服务通信及打款功能，校验防重放。
  - [x] 前端 `SparkModal.tsx` 整合 “使用 Telegram Stars 支付” 按钮，一键调起后端对账与签名微服务打款。

- [x] **设计文档输出**
  - [x] 星币支付桥 Stars 支付桥 KMS 多签、账务及防重放设计（已输出在 `implementation_plan.md`）。
  - [x] AI Webhook 自动解锁里程碑 DAO 仲裁介入状态机设计（已输出在 `implementation_plan.md`）。

- [x] **切片 9 (Phase 2): AI Webhook 里程碑自动解锁及 DAO 仲裁**
  - [x] 新建并运行 `0011_launch_milestones.sql` 里程碑 D1 数据迁移。
  - [x] 扩展主 Worker 并接入 `GET /launches/:id/milestones`、`POST /submit`、`POST /challenge`、`POST /unlock` 里程碑状态机控制器。
  - [x] 扩展前端 `LaunchDetail.tsx`，对项目详情进行网络刷新合并，并集成交互式交付提交、争议申诉和资金划拨组件。
  - [x] 扩展 `verify_api.sh` 脚本并添加 Test 9，测试套件 22/22 全数绿色通过。

- [x] **第一阶段: 主网灰度与集成测试 (Staging & Canary Launch)**
  - [x] **任务 1.1：测试网自托管钱包（Tonkeeper / Telegram Wallet）连接测试与全功能联调**
  - [x] **任务 1.2：Telegram Stars 支付实机调试**
  - [x] **任务 1.3：集成与自动化测试运行与校验**

- [x] **第二阶段: 社交裂变与 AI 自动验收增强 (Growth & Automation)**
  - [x] **任务 2.1：集成 DeepSeek API 用于里程碑交付自动验收**
  - [x] **任务 2.2：集成 Telegram Bot 自动推送通知 (提交、挑战、解锁)**
  - [x] **任务 2.3：前端 LaunchDetail 及 Invite 页面对接 Telegram 原生 WebApp 分享 SDK**
  - [x] **任务 2.4：集成与自动化测试运行与校验**

- [x] **第三阶段: 主网安全审计与冷热钱包隔离 (Security & Governance)**
  - [x] **任务 3.1：热钱包 Stars 支付代付限额风控校验逻辑 (LIMIT_PER_TX = 100 TON, LIMIT_DAILY = 2,000 TON)**
  - [x] **任务 3.2：超出限额自动流转为 PENDING_MULTISIG 状态，停止自动调用签名服务并异步推送 TG Bot 警报**
  - [x] **任务 3.3：实现管理确认路由 POST /api/v1/admin/payment/multisig-confirm，支持管理员多签链上交易 Hash 手工放行**
  - [x] **任务 3.4：实现 env.TON_NETWORK === 'mainnet' 强制风控校验，彻底禁用 Mock reviews 和 Mock signatures，且校验 platform_contracts 所有主网地址**
  - [x] **任务 3.5：扩展 verify_api.sh 增加 Test 10 及 Test 11 覆盖上述限额流转、多签确认及主网强校验行为，37/37 测试全数通过**

- [x] **第四阶段: 审计缺陷排查与验证加固 (Audit Remediations & Sanity Checks)**
  - [x] **任务 4.1：修复 0009 精度回填逻辑并加设数据精度断言**：添加 DB 校验以保证 launches 数据精确至 `1e9` nano 聪单位且无 SQLite 溢出。
  - [x] **任务 4.2：Signer 物理端口安全隔离校验**：确保 `workers_dev = false` 无公网路由，并添加 Test 7e 验证直接通过 HTTP 调用 signer 端口在缺少 secret key 时返回 401 拦截。
  - [x] **任务 4.3：Stars Webhook 预创建对账机制校验**：加强 callback 对 Telegram Bot webhook 密钥的校验，并断言完全通过 DB 订单详情进行支付账目划转。
  - [x] **任务 4.4：偏差说明文档修正**：修订汇总与状态报告，注明开发 admin fallback 钱包及 OnRamp / Stars / AI components 的 staged simulator 机制。
  - [x] **任务 4.5：通过全套集成测试**：本地拉起新进程并执行 verify_api.sh，确保 45/45 测试用例全数通过。

- [x] **第五阶段: 导航高亮修复与体验设计优化 (Navigation Troubleshooting & Polish)**
  - [x] **排查高亮同显 bug**：排查并确认导航栏多重激活原因，重构 `Sidebar.tsx` 与 `MobileNav.tsx` 匹配模式，使用原生 NavLink `isActive` 状态回调替换手动正则前缀路径匹配，实现完美隔离。
  - [x] **导航交互优化**：为侧边栏加入霓虹渐变投影、玻璃拟态背景和悬停 tactile 偏移微动特效，全面升级导航设计精细度与科技质感。
  - [x] **静态类型与编译校验**：同步 i18n 配置文件解决遗留 TS 类型检查错误，重新执行 `npx tsc --noEmit` 完美无错通过。
  - [x] **修复 Bounty 质押页面损坏与变量遮蔽**：补全 `BountyPage.tsx` 损坏的 Staking UI 显示逻辑并排正大括号闭合；纠正 `t` 变量冲突，实现 0 错误编译。

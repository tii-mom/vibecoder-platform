> [!WARNING]
> FROZEN: Phase-specific implementation plan already executed or superseded. Use IMPLEMENTATION_STATUS.md and REMAINING_TASKS.md.
> Registry: [DOCS_FREEZE.md](./DOCS_FREEZE.md)

# VibeCoder 第二阶段：社交裂变与 AI 自动验收增强 (implementation_plan.md)

本文档定义了 Phase 2 中 **Telegram 裂变分享、Bot 推送以及 DeepSeek AI 自动验收** 的具体实现方案。

---

## 1. 架构设计与接口定义

### 1.1 AI 自动验收验收机制 (DeepSeek AI Review)
- **调用路径**：当项目方提交交付物链接时 (`POST /api/v1/launches/:id/milestones/:index/submit`)：
  - 检查后端环境中的 `DEEPSEEK_API_KEY`。
  - 若为真实 API Key (以 `sk-` 开头)，通过 `fetch` 向 DeepSeek 聊天补全接口 (`https://api.deepseek.com/chat/completions`) 发起代码或交付文档合规审查请求。
  - 分析 DeepSeek 的 JSON 响应：
    - **审核通过**：将里程碑状态推进至 `AI_REVIEW_PASSED`，并记录 AI 评审日志，开启 24h 挑战倒计时。
    - **审核失败**：拒绝推进状态（状态保持 `PENDING`），在响应中返回 AI 审计的失败说明（例如：交付链接无效、不满足功能要求等），提示项目方修改后重新提交。
  - **容错降级**：若 API 密钥为 Mock 状态（如 `mock-` 开头）或 API 网络连接超时/失败，则自动降级为“Mock 审核通过”以保证本地测试环境（`verify_api.sh`）和离线状态的顺畅运行。

### 1.2 Telegram Bot 自动消息推送 (Telegram Notification)
- **设计目的**：将里程碑状态流转与社区热度实时打通，通过 Bot 实时推送交付、申诉和解锁事件。
- **触发场景**：
  - 项目方提交交付物 (Submit) 且 AI 审核通过。
  - Backer 对里程碑发起争议挑战 (Challenge)。
  - 里程碑挑战期结束成功解锁划款 (Unlock)。
- **实现方案**：
  - 在 `worker/src/index.ts` 中实现通用消息发送函数 `sendTelegramNotification(c, text)`。
  - 调用 Telegram Bot API `sendMessage` 接口，格式化为带超链接的 **HTML** 消息，带上一键返回 Mini App 的 Bot Link（如 `https://t.me/VCToken9_Bot/app?startapp=launch_${launchId}`）。
  - 消息分发逻辑捕获所有网络异常并进行优雅日志记录，绝不阻塞或中断 API 响应本身。

### 1.3 Telegram Mini App 深度集成分享 (TMA Native Share)
- **设计目的**：利用 TG 官方 App 的内置 WebApp API，实现一键调起 TG 分享选择框和发布 Story。
- **实现方案**：
  - 在 `vc/src/pages/LaunchDetail.tsx` 的里程碑模块及 `vc/src/pages/InvitePage.tsx` 页面中，优化“分享到 Telegram”按钮。
  - 检测 `window.Telegram?.WebApp`：
    - 如果在 TMA 运行，优先调用 `window.Telegram.WebApp.shareToStory` 或 WebApp 内置的分享 API。
    - 否则自动回退为在浏览器中打开通用分享链接 `https://t.me/share/url?url=...&text=...`。
  - 分享文案预设：*“我正在参与 【项目名】(VC-L-xxxxxx) 的共建，该项目已完成里程碑交付，启动 24h 挑战期，点此参与治理/集火！”*。

---

## 2. 拟修改与新增文件

### Worker Backend [MODIFY]
- **`worker/src/index.ts`**：
  - 引入 `sendTelegramNotification` 异步通知辅助函数。
  - 在 `/submit`、`/challenge`、`/unlock` 控制器接口中触发 TG 通知调用。
  - 重构 `/submit` 接口中的 AI 自动审核逻辑，增加对接 DeepSeek 的网络请求以及 JSON 审核结果校验逻辑。

### Frontend UI [MODIFY]
- **`vc/src/pages/LaunchDetail.tsx`** 和 **`vc/src/pages/InvitePage.tsx`**：
  - 新增一键分享至 Telegram 的 UI 按钮及顺滑动画效果，接入 Telegram WebApp SDK 分享方法。

---

## 3. 验证计划

### 3.1 本地自动化集成测试 (`verify_api.sh`)
- 运行测试脚本，确保 Mock 模式下，Stars 支付、里程碑提交、挑战以及解锁依旧能 100% 运行通过。
- 确认 Mock Bot Token 和 Mock DeepSeek Key 不会造成网络请求崩溃或阻塞 API 的 200 返回。

### 3.2 大模型网络请求及错误处理验证
- 在 `verify_api.sh` 之外，使用正确的 `sk-` 密钥启动 wrangler dev 本地服务，并调用 submit 接口提交一个非 GitHub 链接，校验大模型是否能返回 400 失败及真实审查建议。

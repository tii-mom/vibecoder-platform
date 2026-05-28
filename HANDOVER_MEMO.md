> [!WARNING]
> FROZEN: Point-in-time handover snapshot from 2026-05-29. Verify addresses and status against current manifests and IMPLEMENTATION_STATUS.md.
> Registry: [DOCS_FREEZE.md](./DOCS_FREEZE.md)

# VibeCoder Project Handover Memo (2026-05-29)

This document summarizes the development and integration work completed recently. It serves as a guide for colleagues taking over the project to quickly understand the current status, verified addresses, code changes, and testing instructions.

---

## 1. Summary of Completed Phases

### 1.1. Phase 0: Acton Compiler Migration
- **Context**: Porting the contract compiler from Blueprint's legacy Tolk parser to the official Acton compiler to ensure mainnet compatibility.
- **Actions**:
  - Initialized `Acton.toml` in `contracts/`.
  - Added compat wrappers/helpers (e.g., `cellHashCompat`, `addressIsNone`, `sendMsg`, `nowTs`, `eqBits`, `bounced`) to align syntax differences.
  - Migrated all 10 `.tolk` contract source files.
  - Kept Blueprint wrappers (`wrappers/`) intact to allow Jest Sandbox tests to continue running.
- **Verification**: `acton build --clear-cache` and `npx blueprint build --all` compile cleanly. All 11 Jest regression tests pass successfully.

### 1.2. Task 3: On-chain Campaign E2E Validation
- **Context**: The standard TonCenter JSON-RPC nodes (`testnet.toncenter.com`) suffered from rate limits (429) and Lite Server ready errors (500).
- **Actions**:
  - Re-architected [test-launch.ts](contracts/scripts/test-launch.ts) to use `TonClient4` referencing the stable `testnet-v4.tonhubapi.com` node.
  - Successfully ran an end-to-end launch campaign scenario on the TON testnet.
- **Verified Addresses on TON Testnet**:
  - **Launch Campaign Contract**: `UQCcdG2z90oeMRojITcWBXRWIxViQmPf0AS5jQpwLO7PSgMU`
  - **Deployed Jetton Master Contract**: `EQDRAy7AUC3taPIAtr_2mm5qIDcgyws9JgarLDuo2zqOyES8`
- **Result**: Confirmed that sending 2 consecutive Spark transactions crossing the 55% funding threshold automatically triggers the deployer flag and initializes the Project Token Master contract on-chain.

### 1.3. Task 4 & 7: Exchange Bounty & OnRamp Integration
- **Context**: Provide fiat-to-crypto entry support for Chinese and global users via Binance, OKX, and Bitget, and credit users with 1,000 $VC upon successful KYC/C2C upload verification.
- **Actions (Backend)**:
  - Created SQLite D1 migration `0006_bounty_exchange.sql` to add `exchange_uid` and `screenshot_url` to `bounty_submissions` and seed tasks.
  - Configured `nodejs_compat` in `wrangler.toml` and loaded global `Buffer` polyfill in Hono worker entry.
  - Updated submit endpoint to insert `EXCHANGE_REG` tasks as `PENDING` without auto-crediting user balances.
  - Implemented the admin verify endpoint `POST /api/v1/admin/bounty/submissions/:subId/verify` (credits balance on approval, reverts slot occupancy on rejection).
  - Created `GET /api/v1/bounty/submissions` so the frontend can check user submission history.
- **Actions (Frontend)**:
  - Wire [OnRampPage.tsx](vc/src/pages/OnRampPage.tsx) to routing and navigation (linked in sidebar and mobile drawer).
  - Refactored submission params to payload `{ exchangeUid, screenshotUrl }` matching Hono.
  - Replaced local states with fetch to `/api/v1/bounty/submissions` to dynamically render badges for `PENDING` (待审核), `VERIFIED` (已完成), and `REJECTED` (已拒绝).

### 1.4. Security Audit Fixes (P0/P1 Resolution)
- **Staking Transaction Integrity**:
  - Restricted mock transaction bypass inside `/api/v1/bounty/stake` to development mode (`c.env.ENVIRONMENT === 'development'`). Production builds will strictly check on-chain hashes.
  - Rewrote the used transaction hash log and staking entry insertions to use D1 atomic batch queries (`c.env.DB.batch`), resolving replay attacks and TOCTOU vulnerabilities.
- **IDOR Protections**:
  - Audited all API endpoints (Rules, Wallets, Logs) to ensure they query only rows matching the authenticated JWT context (`c.get('user_id')`) rather than untrusted query or JSON body fields.
- **Fund empty-body state protection**:
  - Verified `fund.tolk` calls `loadData()` before processing empty body messages to prevent state corruption. Added sandbox coverage for empty body messages.

---

## 2. Verification Commands & How to Run

### 2.1. Smart Contracts
To rebuild contracts using Acton and run all Sandbox/Jest tests:
```bash
cd contracts
acton build --clear-cache
npm test
```
*Expected: 11/11 tests pass.*

### 2.2. Backend API
To typecheck the Cloudflare Hono worker:
```bash
cd worker
npm run typecheck
```
*Expected: No compilation errors.*

### 2.3. Frontend Client
To check Vite build and chunk optimization:
```bash
cd vc
npm run build
```
*Expected: Builds successfully inside `dist/`.*

---

## 3. Contact & Context Files
- Detailed walkthrough: `walkthrough.md` in AppData / Brain artifacts.
- Task status logs: `task.md` in AppData / Brain artifacts.
- Audited vulnerabilities: `SECURITY_AUDIT_REPORT.md` in root workspace.

# E2E Gate Plan — Non-Contract Deployment Verification

This document defines the minimum browser-based E2E verification commands
for non-contract deployment readiness. All commands are copy-paste ready.

## Prerequisites

- `vc/` built: `cd vc && npm run build`
- Worker running (local or staging): `cd worker && npm run dev` or deployed
- Signer running (local or staging): `cd signer && npm run dev` or deployed
- A test admin JWT for smoke endpoints
- Playwright installed: `cd vc && npx playwright install chromium`

## Pre-Deployment Verification Checklist

### 0. Production Config Check (Static)

```bash
# Check worker/signer env vars for production safety
cd vc && npm run check:production
```

### 1. Smoke Tests (CLI)

```bash
# Signer smoke test — no signing, no broadcasting
# Required env: SMOKE_API_BASE, SMOKE_ADMIN_TOKEN, SMOKE_IS_PRODUCTION
cd vc && SMOKE_API_BASE=http://localhost:8787 SMOKE_ADMIN_TOKEN=<admin-jwt> npm run smoke:signer

# Stars idempotency verification — static code pattern check
cd vc && npm run smoke:stars

# Stars idempotency verification — LIVE runtime test (requires running Worker + D1)
# Required env: STARS_API_BASE, STARS_WEBHOOK_SECRET, STARS_ADMIN_TOKEN
cd vc && STARS_API_BASE=http://localhost:8787 STARS_WEBHOOK_SECRET=<secret> STARS_ADMIN_TOKEN=<token> npm run smoke:stars-live
```

### 2. E2E Browser Tests (Playwright)

```bash
# Run all E2E tests (launches dev server automatically)
cd vc && npx playwright test

# Run specific test file
cd vc && npx playwright test e2e/gate.spec.ts

# Run with custom backend URL (skip dev server)
cd vc && E2E_BASE_URL=https://api.72h.lol E2E_NO_DEV_SERVER=1 npx playwright test

# Show browser UI during test (debug)
cd vc && npx playwright test --headed
```

### 3. Browser Manual Verification

All browser tests use incognito/private mode. Never use a default Chrome/Safari profile with wallet extensions.

#### 2.1 Homepage / First Screen Load

1. Open `http://localhost:3000` in incognito
2. Verify the landing page renders without JS errors (check console)
3. Verify navigation menu items are present

#### 2.2 Wallet Proof — Production Fail-Closed

1. Navigate to any authenticated page (e.g. `/bounty`)
2. Without connecting a wallet, verify the page shows "Connect Wallet" CTA
3. With a wallet connected, verify the proof check succeeds via API
4. **Production validation**: disconnect the Worker backend — all authenticated pages must show error states, never fall back to mock/guest mode

#### 2.3 Create Launch — Form Validation

1. Navigate to `/launch/create`
2. Submit without filling required fields — verify inline error messages appear (not `alert()`)
3. Fill all fields and submit — verify the success page shows the project code from API
4. Verify category select values are stable English codes, not localized CJK strings

#### 2.4 Copilot Rules Page

1. Navigate to the copilot/rules page
2. Attempt to load rules — verify loading state is shown
3. If backend is down, verify an error message is displayed, not a blank page or random scores
4. Verify no `Math.random()` generated scores appear when AI is unavailable

#### 2.5 Bounty Submission — PENDING Status

1. Navigate to `/bounty`
2. Submit a task — verify the success message says "awaiting verification" (pending), not "VC credited"
3. The earnings bar should NOT increase immediately after submission
4. Verify that refreshing the page maintains the correct pending state

#### 2.6 AI Unavailable — No Random Scores

1. Disconnect the AI backend (DeepSeek proxy)
2. Navigate to a copilot analysis page
3. Verify the UI shows "AI analysis unavailable" or similar, NOT a random/generated score

### 3. Stars Callback Idempotency (API Test)

This can be tested via API rather than browser:

```bash
# Test 1: First callback — should succeed with PENDING_CALLBACK -> PROCESSING transition
curl -X POST http://localhost:8787/api/v1/payment/stars-callback \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: <secret>" \
  -d '{"id": "stars-ch-test-1"}'

# Test 2: Second callback (duplicate) — should return PROCESSING, not call Signer again
# Same request as above — verify response shows status: PROCESSING or SUCCESS

# Test 3: After SUCCESS — should return existing txHash
# Verify the response includes the onchain tx hash from the first successful call
```

### 4. i18n / Mock Boundary Scan

```bash
cd vc && npm run lint:i18n
```

## Environment Requirements

| Test | Requires Backend | Requires Wallet | Requires Mainnet |
|------|-----------------|-----------------|------------------|
| Smoke (signer) | Yes | No | No |
| Smoke (stars) | No (static) | No | No |
| Homepage | No | No | No |
| Wallet proof | Yes | Yes (connect) | No |
| Create Launch | Yes | Yes (connect) | No |
| Copilot rules | Yes | No | No |
| Bounty pending | Yes | Yes (connect) | No |
| AI fallback | Yes (simulate down) | No | No |
| Stars idempotency | Yes | No | No |
| i18n scan | No (static) | No | No |

## Failure Criteria

Any of the following must block deployment:
- Signer smoke returns `isMock:true` in non-development environment
- Bounty submission shows "VC credited" before admin verification
- AI scoring falls back to random values when backend is unavailable
- Create Launch form shows `alert()` instead of inline errors
- Stars callback can be replayed to trigger duplicate Signer calls
- Wallet proof falls back to mock/guest mode in production when backend is unreachable

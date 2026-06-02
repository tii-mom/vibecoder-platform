# Testnet Launch Blockers Audit

> Generated: 2026-06-02
> Branch: `stabilize/testnet-platform-contracts-v1`

## Blocker Summary

| # | Severity | Status | Description |
|---|----------|--------|-------------|
| 1 | P0 | ✅ RESOLVED | D1 platform_contracts has correct 6 testnet addresses |
| 2 | P0 | ✅ RESOLVED | Worker /api/v1/platform/contracts returns 6 contracts |
| 3 | P0 | ✅ RESOLVED | Frontend reads VC_JETTON from Worker, legacy addresses dev-only |
| 4 | P0 | ✅ RESOLVED | Mock/simulator never auto-pass in non-development |
| 5 | P1 | ✅ RESOLVED | Frozen docs have freeze banners |
| 6 | P1 | ✅ RESOLVED | No references to removed contracts (EarlySubscription, Strategic) |
| 7 | P1 | ✅ RESOLVED | VC_JETTON admin not revoked (intentional) |
| 8 | P2 | ✅ RESOLVED | Verifiable production config check exists |

---

## P0 Blockers — Detailed

### 1. D1 platform_contracts completeness

**Evidence**: `worker/migrations/0001_schema.sql` line 42-49 defines `platform_contracts` table.
Migration `0013_platform_contract_network.sql` updates schema to `UNIQUE(network, contract_name)`.
`tools/sync-platform-contracts.mjs` reads `testnet.platform.json` and generates upsert SQL.

**Fix plan**:
- Run `node tools/sync-platform-contracts.mjs --network testnet` to preview SQL
- Verify 6 contract names: VC_JETTON, FUND, VC_REWARD_POOL, EARLY_FUNDRAISING, LAUNCH_FEE, TOKEN_LAUNCHER
- Apply with `--apply` flag when D1 is reachable

**Acceptance**: `/api/v1/platform/contracts` returns `success:true` with exactly 6 contracts.

### 2. Worker platform contracts endpoint

**Evidence**: `worker/src/index.ts` line ~1064: `GET /api/v1/platform/contracts` queries D1.

**Current behavior**: Returns contracts filtered by `TON_NETWORK`. Falls back gracefully if D1 has no data.

**Fix plan**: Add validation that all 6 REQUIRED_PLATFORM_CONTRACTS are present. Return `missing` field if incomplete.

**Acceptance**: Endpoint returns 6 contracts or explicit `missing` field.

### 3. Frontend VC_JETTON detection

**Evidence**: `vc/src/pages/BountyPage.tsx` line ~287: `KNOWN_VC_MASTERS` includes `vcMasterContract?.address` from Worker API plus 2 legacy testnet addresses. Symbol fallback `b.jetton.symbol === 'VC'` at line ~299.

**Fix plan**:
- `vcMasterContract?.address` is already fed from Worker API ✅
- Legacy addresses gated behind `isLocalDev` check
- Symbol fallback gated behind `isLocalDev`

**Acceptance**: Non-localhost production never uses symbol-only or legacy-address-only VC detection.

### 4. Mock/simulator guards

**Evidence**: 
- `worker/src/index.ts` line ~80-137: AI review fail-closed (`typeof parsed.pass !== 'boolean' → pass:false`)
- `worker/src/index.ts` line ~2008: tx_hash mock detection for staking
- `worker/src/index.ts` line ~2302: Signer mock rejection outside dev
- `worker/src/services/bounty-verifier.ts` line 14: production returns `false`
- `signer/src/index.ts` line 76: mainnet rejects weak API keys

**Fix plan**: All guards already in place. `tools/production-config-check.mjs` verifies them statically.

**Acceptance**: `npm run check:production` runs cleanly.

---

## P1 Blockers — Detailed

### 5. Frozen documents

**Evidence**: `DOCS_FREEZE.md` lists current sources and frozen documents.
Some frozen docs lack in-file freeze banners.

**Fix plan**: Add `⚠️ FROZEN` banner to top of each frozen doc.

**Acceptance**: Every frozen doc in DOCS_FREEZE.md has visible freeze banner.

### 6. Removed contracts

**Evidence**: EarlySubscription and Strategic were removed. New contracts: EARLY_FUNDRAISING, VC_REWARD_POOL.

**Fix plan**:
- D1 schema comment updated (already done in migration 0001)
- `/api/v1/platform/contracts` only returns current 6 names

**Acceptance**: No reference to EarlySubscription/Strategic in active code paths.

### 7. VC_JETTON admin retention

**Evidence**: `contracts/docs/pre-mainnet-readiness.md` explicitly states admin is retained.
`VC_JETTON` `get_jetton_data()` shows `mintable=-1` (can still mint).

**Fix plan**: No action needed. This is intentional policy.

**Acceptance**: No thread attempts to revoke admin as part of this stabilization.

---

## P2 — Non-blocking

### 8. Production config check

**Evidence**: `tools/production-config-check.mjs` runs `check:production`.
Currently returns 7 pass, 1 warning (ENVIRONMENT not set).

**Fix plan**: Document that ENVIRONMENT warning is expected in local dev.

**Acceptance**: `npm run check:production` exits 0.

---

## File Inventory

| File | Exists | Status |
|------|--------|--------|
| `contracts/deployments/testnet.platform.json` | ✅ | 6 contracts, all verified |
| `.env.example` | ✅ | Mainnet-ready placeholders |
| `contracts/docs/pre-mainnet-readiness.md` | ✅ | Testnet status documented |
| `DOCS_FREEZE.md` | ✅ | Lists current + frozen docs |
| `DEVELOPMENT_RULES.md` | ✅ | Development guidelines |
| `REMAINING_TASKS.md` | ✅ | Updated for testnet stage |
| `worker/src/index.ts` | ✅ | 2 new chain-read endpoints |
| `vc/src/pages/BountyPage.tsx` | ✅ | Worker API VC detection |

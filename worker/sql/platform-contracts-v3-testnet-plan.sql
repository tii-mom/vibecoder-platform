-- ============================================================
-- PLAN ONLY. Do not execute against production database.
-- Requires manual review before execution.
-- Execute only after:
--   1. SaleVesting / TeamVesting are deployed to testnet.
--   2. Get-method verification passes:
--      npm run verify:vc-v3:testnet
--   3. Addresses are reviewed and confirmed.
-- ============================================================
-- VC v3 Platform Contracts — Testnet D1 Insert Plan
-- ============================================================

-- ============================================================
-- SALE_VESTING
-- Execute after deployment confirmed:
-- ============================================================
-- INSERT OR REPLACE INTO platform_contracts (contract_name, network, address, created_at)
-- VALUES ('SALE_VESTING', 'testnet', '<FILL_AFTER_DEPLOY>', datetime('now'));

-- ============================================================
-- TEAM_VESTING
-- Execute after deployment confirmed:
-- ============================================================
-- INSERT OR REPLACE INTO platform_contracts (contract_name, network, address, created_at)
-- VALUES ('TEAM_VESTING', 'testnet', '<FILL_AFTER_DEPLOY>', datetime('now'));

-- ============================================================
-- After deployment, update the placeholders with actual addresses
-- from deployments/testnet.vc-v3.json / v3Contracts.
-- ============================================================

-- ============================================================
-- Verification query (read-only, safe):
-- ============================================================
-- SELECT contract_name, network, address FROM platform_contracts
-- WHERE network = 'testnet' AND contract_name IN ('SALE_VESTING', 'TEAM_VESTING')
-- ORDER BY contract_name;

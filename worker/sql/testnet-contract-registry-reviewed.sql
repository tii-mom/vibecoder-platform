-- ============================================================
-- Unified Testnet Contract Registry — Reviewed Plan
-- ============================================================
-- PLAN ONLY. Do not execute against production database.
-- Execute only after manual review on testnet D1.
-- D1 master: 66ec569e-6840-412d-a427-3b53f64820df
-- ============================================================
-- Review status:
--   - testnet-reviewed-plan.sql: reviewed, consolidated here
--   - platform-contracts-v3-testnet-plan.sql: reviewed, consolidated here
--   - simple-launch-v1-testnet-plan.sql: reviewed (on ops/simple-launch-v1-testnet-deploy)
-- ============================================================

BEGIN TRANSACTION;

-- ============================================================
-- Section 1: VC v3 Platform Contracts (deployed, testnet)
-- Source: contracts/deployments/testnet.vc-v3.full.json
-- Status: deployed on testnet, verified on-chain
-- ============================================================
INSERT OR REPLACE INTO platform_contracts (id, contract_name, address, network, deployed_at)
VALUES
  ('testnet-VC_JETTON', 'VC_JETTON', 'UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf', 'testnet', datetime('now')),
  ('testnet-FUND', 'FUND', 'UQADQbeXROSyyCBwE2qPuhr2cbE0hXgWhVCJawR9UVK9CH0Q', 'testnet', datetime('now')),
  ('testnet-VC_REWARD_POOL', 'VC_REWARD_POOL', 'UQD6Zak3m1RdCA1OOIMFSh3fF6VrsgBIwxLcpn1o76YUiVZN', 'testnet', datetime('now')),
  ('testnet-EARLY_FUNDRAISING', 'EARLY_FUNDRAISING', 'UQBXX3nt12ZKmeY9ITF6G_YC4eh3JCspxnOCX762sBDWdqDD', 'testnet', datetime('now')),
  ('testnet-LAUNCH_FEE', 'LAUNCH_FEE', 'UQBs3qGxQ5KMPLM1aQfolsc6uoLfHaFtZ3XT0ZtNN9hXuzW-', 'testnet', datetime('now')),
  ('testnet-TOKEN_LAUNCHER', 'TOKEN_LAUNCHER', 'UQAYzEOHPZgHeS9gmJxGBUFJrvkn2JnBCv4uD2OmkK_FeSXs', 'testnet', datetime('now')),
  ('testnet-SALE_VESTING', 'SALE_VESTING', 'UQAV6noSRUR7C83RwCB3T4XV0ylVqCAs_Crf1N5aHp6KzScm', 'testnet', datetime('now')),
  ('testnet-TEAM_VESTING', 'TEAM_VESTING', 'UQD24kG-Pnl2OyJAs2hYtbRnBVOkgtsdhhD6z14u46NfSkRF', 'testnet', datetime('now')),
  ('testnet-DEVELOPER_REWARD_POOL', 'DEVELOPER_REWARD_POOL', 'UQCZFgdSfL4uGwExeG5wGMo96Aly8Lc5sx_Sf_HDpm27b9JD', 'testnet', datetime('now')),
  ('testnet-ECOSYSTEM_REWARD_POOL', 'ECOSYSTEM_REWARD_POOL', 'UQA-icYnrMhyb7Qe-wvBDH2k9g5a0is_z-jRfKHmW-HeaqV5', 'testnet', datetime('now')),
  ('testnet-DEVELOPMENT_FUND', 'DEVELOPMENT_FUND', 'UQDJio3xtfCzu7TWhmxc8r1IeGyC2V7Hr0zLo3LTlbHkNm16', 'testnet', datetime('now')),
  ('testnet-RESERVE_VAULT', 'RESERVE_VAULT', 'UQCoVCCLCf7RxJ7BykJ4UlbhrtPI2I1894yLL2UkAXKiZ6vw', 'testnet', datetime('now'));

-- ============================================================
-- Section 2: SimpleLaunch v1 Contracts (planned, testnet)
-- Source: contracts/deployments/testnet.simple-launch.plan.json
-- Status: planned, deployment pending RPC recovery
-- Note: Addresses are predicted; may change after actual deployment.
-- ============================================================
INSERT OR REPLACE INTO platform_contracts (id, contract_name, address, network, deployed_at)
VALUES
  ('testnet-LAUNCH_ESCROW', 'LAUNCH_ESCROW', 'UQCjSgUHoTVwScc-ahTXMSi7HO8z0g8WUGmXTyCa1G4WWSGo', 'testnet', datetime('now')),
  ('testnet-SIMPLE_LAUNCH_CAMPAIGN', 'SIMPLE_LAUNCH_CAMPAIGN', 'UQCsmFhjHmFmExMopMA8UnWK6hxn-uaoo161VrWog0Cnxk3Y', 'testnet', datetime('now'));

-- ProjectToken is created by campaign activation, not deployed directly.
-- Add after deployment when activation is complete:
-- INSERT OR REPLACE INTO platform_contracts (id, contract_name, address, network, deployed_at)
-- VALUES ('testnet-PROJECT_TOKEN', 'PROJECT_TOKEN', 'TBD_AFTER_ACTIVATION', 'testnet', datetime('now'));

-- ============================================================
-- Section 3: Self VC Wallets (testnet)
-- These wallets hold VC tokens for contract operations.
-- ============================================================
INSERT OR REPLACE INTO platform_contracts (id, contract_name, address, network, deployed_at)
VALUES
  ('testnet-SALE_VESTING_VC_WALLET', 'SALE_VESTING_VC_WALLET', 'UQANAqwlEmVLjKB4PfiIDo0HVLtuGmPOID-nbpW3SKd9IN2p', 'testnet', datetime('now')),
  ('testnet-TEAM_VESTING_VC_WALLET', 'TEAM_VESTING_VC_WALLET', 'UQBFi75JuzGEboqywouPJKGRZSiRmKpVk0nxPTt0tNsmM7lO', 'testnet', datetime('now')),
  ('testnet-DEVELOPER_REWARD_POOL_VC_WALLET', 'DEVELOPER_REWARD_POOL_VC_WALLET', 'UQA2096EFdYa_wOPUwxFDfwN9FabFxwrmlKInMX4qsRPwBXE', 'testnet', datetime('now')),
  ('testnet-ECOSYSTEM_REWARD_POOL_VC_WALLET', 'ECOSYSTEM_REWARD_POOL_VC_WALLET', 'UQBS3mKuzdveILepkUrqpa_KT558tdMpTjd2tD0tnW53hXJP', 'testnet', datetime('now')),
  ('testnet-DEVELOPMENT_FUND_VC_WALLET', 'DEVELOPMENT_FUND_VC_WALLET', 'UQCf4Y6t2WahVNY3uBXjdatL32VhSGf22owl0W8E3l4_OSz_', 'testnet', datetime('now')),
  ('testnet-RESERVE_VAULT_VC_WALLET', 'RESERVE_VAULT_VC_WALLET', 'UQAt-3WnhIRCzlCkRCACNn9e2J0l73t3npErCmNtSW81x954', 'testnet', datetime('now'));

-- ============================================================
-- Verification: list all testnet contracts
-- ============================================================
SELECT id, contract_name, address, network
FROM platform_contracts
WHERE network = 'testnet'
ORDER BY id;

ROLLBACK;

-- ============================================================
-- Replace ROLLBACK with COMMIT only in a separately approved
-- testnet D1 execution task.
-- ============================================================

-- ============================================================
-- Rollback SQL (if COMMIT was executed)
-- ============================================================
-- DELETE FROM platform_contracts WHERE id LIKE 'testnet-%';
-- Or selectively:
-- DELETE FROM platform_contracts WHERE id = 'testnet-LAUNCH_ESCROW';
-- DELETE FROM platform_contracts WHERE id = 'testnet-SIMPLE_LAUNCH_CAMPAIGN';
--
-- Note: deleting VC v3 contracts would break existing integrations.
-- Only delete if superseded by a new registry.
-- ============================================================

-- ============================================================
-- Review notes:
-- 1. VC_JETTON, FUND, VC_REWARD_POOL, EARLY_FUNDRAISING, LAUNCH_FEE,
--    TOKEN_LAUNCHER are v2 platform contracts. They remain active on
--    testnet alongside v3 contracts.
-- 2. SimpleLaunch addresses are predicted from dry-run and may change
--    when real deployment occurs (deployer nonce may differ).
-- 3. Self VC wallets are derived from contract addresses and hold
--    VC tokens for contract operations.
-- 4. Production D1 execution remains out of scope here.
-- ============================================================

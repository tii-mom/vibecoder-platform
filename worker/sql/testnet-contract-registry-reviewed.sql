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
--   - simple-launch-v1-testnet-plan.sql: reviewed and updated with deployed addresses
-- Execution status:
--   - Testnet D1 executed: NO
--   - Production D1 executed: NO
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
-- Section 2: SimpleLaunch v1 Contracts (deployed, testnet)
-- Source: contracts/deployments/testnet.simple-launch.json
-- Status: deployed on testnet; success flow completed.
-- Failure/refund evidence lives in:
--   contracts/deployments/testnet.simple-launch.failure-refund.json
-- ============================================================
INSERT OR REPLACE INTO platform_contracts (id, contract_name, address, network, deployed_at)
VALUES
  ('testnet-LAUNCH_ESCROW', 'LAUNCH_ESCROW', 'UQAbBqEAuArxhgvAja3dP3tF5CsJ6s3NyMtWRV6unkjEd24h', 'testnet', datetime('now')),
  ('testnet-SIMPLE_LAUNCH_CAMPAIGN', 'SIMPLE_LAUNCH_CAMPAIGN', 'UQB2khuJechrKt9P2xADTWJVY7iQQF8GXOeHNbtLADdZjgxC', 'testnet', datetime('now')),
  ('testnet-PROJECT_TOKEN', 'PROJECT_TOKEN', 'UQBdnCJ4s-NtEocbEf7dfJ85j7kLB66XevQtsF1WyjkwLClz', 'testnet', datetime('now'));

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
--
-- Note: deleting VC v3 contracts would break existing integrations.
-- Only delete if superseded by a new registry.
-- SimpleLaunch rollback is included by the testnet-% delete above.
-- ============================================================

-- ============================================================
-- Review notes:
-- 1. VC_JETTON, FUND, VC_REWARD_POOL, EARLY_FUNDRAISING, LAUNCH_FEE,
--    TOKEN_LAUNCHER are v2 platform contracts. They remain active on
--    testnet alongside v3 contracts.
-- 2. SimpleLaunch addresses are real deployed testnet addresses from
--    contracts/deployments/testnet.simple-launch.json. Historical dry-run
--    predicted addresses must not be used as registry truth.
-- 3. Self VC wallets are derived from contract addresses and hold
--    VC tokens for contract operations.
-- 4. Production D1 execution remains out of scope here.
-- 5. This file ends with ROLLBACK. It is safe to run as-is in any
--    D1 environment without causing data changes.
-- ============================================================

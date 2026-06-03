-- ============================================================
-- TESTNET REVIEWED PLAN ONLY. NOT EXECUTED.
-- Do not execute against production D1.
-- Execute only after manual review and explicit environment approval.
-- Source manifest: contracts/deployments/testnet.vc-v3.full.json
-- ============================================================

BEGIN TRANSACTION;

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

SELECT contract_name, network, address
FROM platform_contracts
WHERE network = 'testnet'
ORDER BY contract_name;

ROLLBACK;

-- Review note:
-- This plan intentionally ends with ROLLBACK. Replace ROLLBACK with COMMIT only in an approved
-- non-production execution task. Production D1 SQL remains out of scope here.

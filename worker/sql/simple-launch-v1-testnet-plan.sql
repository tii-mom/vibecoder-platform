-- ============================================================
-- PLAN ONLY. Do not execute against production database.
-- Requires manual review before execution.
-- Source manifest: contracts/deployments/testnet.simple-launch.plan.json
-- Deployed manifest: contracts/deployments/testnet.simple-launch.json (pending)
-- ============================================================
-- SimpleLaunch v1 Contracts — Testnet D1 Insert Plan
-- ============================================================

BEGIN TRANSACTION;

-- LaunchEscrow v1
INSERT OR REPLACE INTO platform_contracts (id, contract_name, address, network, deployed_at)
VALUES
  ('testnet-LAUNCH_ESCROW', 'LAUNCH_ESCROW', 'UQCjSgUHoTVwScc-ahTXMSi7HO8z0g8WUGmXTyCa1G4WWSGo', 'testnet', datetime('now'));

-- SimpleLaunchCampaign v1
INSERT OR REPLACE INTO platform_contracts (id, contract_name, address, network, deployed_at)
VALUES
  ('testnet-SIMPLE_LAUNCH_CAMPAIGN', 'SIMPLE_LAUNCH_CAMPAIGN', 'UQCsmFhjHmFmExMopMA8UnWK6hxn-uaoo161VrWog0Cnxk3Y', 'testnet', datetime('now'));

-- ProjectToken (created by campaign activation — address is predicted, will be updated after deployment)
-- Address will change if deployer wallet nonce changes before deployment.
-- INSERT OR REPLACE INTO platform_contracts (id, contract_name, address, network, deployed_at)
-- VALUES
--   ('testnet-PROJECT_TOKEN', 'PROJECT_TOKEN', 'UQDn1PLpvc6QVMkJdh9l5IEJDKL7_alFS89EPv7aPiaI0pTV', 'testnet', datetime('now'));

-- Verify inserted rows
SELECT contract_name, network, address
FROM platform_contracts
WHERE network = 'testnet'
ORDER BY contract_name;

ROLLBACK;

-- ============================================================
-- Replace ROLLBACK with COMMIT only in a separately approved
-- testnet D1 execution task.
-- ============================================================
-- Rollback SQL (if needed after commit):
--
-- DELETE FROM platform_contracts WHERE id = 'testnet-LAUNCH_ESCROW';
-- DELETE FROM platform_contracts WHERE id = 'testnet-SIMPLE_LAUNCH_CAMPAIGN';
-- DELETE FROM platform_contracts WHERE id = 'testnet-PROJECT_TOKEN';
-- ============================================================

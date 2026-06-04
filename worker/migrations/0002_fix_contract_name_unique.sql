-- Migration 0002: Fix platform_contracts schema for multi-network support
-- Problem: contract_name TEXT UNIQUE prevents same contract name on testnet and mainnet.
-- Solution: Drop UNIQUE constraint, add composite unique on (contract_name, network).

-- CAUTION: D1 does not support ALTER TABLE DROP CONSTRAINT.
-- Recreate the table if it has no critical production data.
-- For testnet execution only.

-- Step 1: Backup existing data
CREATE TABLE IF NOT EXISTS platform_contracts_backup_0002 AS
SELECT * FROM platform_contracts;

-- Step 2: Drop and recreate with corrected schema
DROP TABLE IF EXISTS platform_contracts;

CREATE TABLE platform_contracts (
  id TEXT PRIMARY KEY,
  contract_name TEXT NOT NULL,
  address TEXT,
  network TEXT DEFAULT 'testnet',
  deployed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(contract_name, network)
);

-- Step 3: Restore data
INSERT INTO platform_contracts (id, contract_name, address, network, deployed_at)
SELECT id, contract_name, address, network, deployed_at
FROM platform_contracts_backup_0002;

-- Step 4: Cleanup backup (keep for rollback inspection)
-- DROP TABLE IF EXISTS platform_contracts_backup_0002;

-- Verification
SELECT contract_name, network, address
FROM platform_contracts
ORDER BY contract_name, network;

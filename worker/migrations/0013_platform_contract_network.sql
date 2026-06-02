-- Allow testnet and mainnet platform contract addresses to coexist.
-- Previous schema had contract_name UNIQUE, which made a second network impossible.

CREATE TABLE IF NOT EXISTS platform_contracts_new (
  id TEXT PRIMARY KEY,
  contract_name TEXT NOT NULL,
  address TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'testnet',
  deployed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(network, contract_name)
);

INSERT OR REPLACE INTO platform_contracts_new (id, contract_name, address, network, deployed_at)
SELECT
  COALESCE(id, network || '-' || contract_name),
  contract_name,
  address,
  COALESCE(network, 'testnet'),
  deployed_at
FROM platform_contracts
WHERE contract_name IS NOT NULL
  AND address IS NOT NULL;

DROP TABLE platform_contracts;
ALTER TABLE platform_contracts_new RENAME TO platform_contracts;

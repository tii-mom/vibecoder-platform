-- Track on-chain Spark transactions before indexing them into raised_total.
-- Migration 0014
CREATE TABLE IF NOT EXISTS spark_onchain_events (
  id TEXT PRIMARY KEY,
  launch_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  campaign_address TEXT NOT NULL,
  tx_hash TEXT,
  tx_boc TEXT,
  amount_nano INTEGER NOT NULL,
  tokens_nano INTEGER,
  status TEXT NOT NULL DEFAULT 'PENDING_ONCHAIN',
  source TEXT DEFAULT 'TONCONNECT',
  error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spark_onchain_tx_hash
ON spark_onchain_events(tx_hash)
WHERE tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spark_onchain_launch_user
ON spark_onchain_events(launch_id, user_id);

CREATE INDEX IF NOT EXISTS idx_spark_onchain_status
ON spark_onchain_events(status);

-- Add campaign_address to launches if not already present
-- (no-op if column exists, Cloudflare D1 handles this via separate migration check)

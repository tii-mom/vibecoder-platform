-- Add campaign_address to launches for on-chain Spark.
-- Migration 0015
-- Cloudflare D1 does not support IF NOT EXISTS for ALTER TABLE ADD COLUMN.
-- If the column already exists from a previous migration, the ALTER will fail.
-- In that case, check first: PRAGMA table_info(launches);
-- If campaign_address is already present, skip this migration.

ALTER TABLE launches ADD COLUMN campaign_address TEXT;
ALTER TABLE launches ADD COLUMN onchain_status TEXT DEFAULT 'OFFCHAIN';

-- Migration 0009: Precision migration (REAL -> INTEGER nano) & Admin Audit Logs
-- ============================================================

-- 1. Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_wallet TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  payload TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 2. Add precision nano fields to launches
ALTER TABLE launches ADD COLUMN target_total_nano INTEGER;
ALTER TABLE launches ADD COLUMN raised_total_nano INTEGER;
ALTER TABLE launches ADD COLUMN stage1_target_nano INTEGER;
ALTER TABLE launches ADD COLUMN stage2_target_nano INTEGER;

-- 3. Add precision nano fields to spark_records
ALTER TABLE spark_records ADD COLUMN amount_nano INTEGER;
ALTER TABLE spark_records ADD COLUMN tokens_nano INTEGER;

-- 4. Add precision nano fields to governance_proposals
ALTER TABLE governance_proposals ADD COLUMN amount_nano INTEGER;

-- 5. Add precision nano fields to exit_requests
ALTER TABLE exit_requests ADD COLUMN redeemed_ton_nano INTEGER;
ALTER TABLE exit_requests ADD COLUMN burned_tokens_nano INTEGER;

-- 6. Backfill existing data using safe conditional conversion
-- If the value is already scaled (> 10,000,000), copy directly. Otherwise, multiply by 1e9.
UPDATE launches SET target_total_nano = CAST(CASE WHEN target_total > 10000000 THEN target_total ELSE target_total * 1000000000 END AS INTEGER) WHERE target_total IS NOT NULL;
UPDATE launches SET raised_total_nano = CAST(CASE WHEN raised_total > 10000000 THEN raised_total ELSE raised_total * 1000000000 END AS INTEGER) WHERE raised_total IS NOT NULL;
UPDATE launches SET stage1_target_nano = CAST(CASE WHEN stage1_target > 10000000 THEN stage1_target ELSE stage1_target * 1000000000 END AS INTEGER) WHERE stage1_target IS NOT NULL;
UPDATE launches SET stage2_target_nano = CAST(CASE WHEN stage2_target > 10000000 THEN stage2_target ELSE stage2_target * 1000000000 END AS INTEGER) WHERE stage2_target IS NOT NULL;

UPDATE spark_records SET amount_nano = CAST(CASE WHEN amount > 10000000 THEN amount ELSE amount * 1000000000 END AS INTEGER) WHERE amount IS NOT NULL;
UPDATE spark_records SET tokens_nano = CAST(CASE WHEN tokens > 10000000 THEN tokens ELSE tokens * 1000000000 END AS INTEGER) WHERE tokens IS NOT NULL;

UPDATE governance_proposals SET amount_nano = CAST(CASE WHEN amount > 10000000 THEN amount ELSE amount * 1000000000 END AS INTEGER) WHERE amount IS NOT NULL;

UPDATE exit_requests SET redeemed_ton_nano = CAST(CASE WHEN redeemed_ton > 10000000 THEN redeemed_ton ELSE redeemed_ton * 1000000000 END AS INTEGER) WHERE redeemed_ton IS NOT NULL;
UPDATE exit_requests SET burned_tokens_nano = CAST(CASE WHEN burned_tokens > 10000000 THEN burned_tokens ELSE burned_tokens * 1000000000 END AS INTEGER) WHERE burned_tokens IS NOT NULL;

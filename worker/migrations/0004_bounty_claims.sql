-- Bounty claim payout queue
-- Claim requests are created by /api/v1/bounty/claim and confirmed by an off-chain payout script.
CREATE TABLE IF NOT EXISTS bounty_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount_vc REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING / SUBMITTED / CONFIRMED
  tx_hash TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bounty_claims_user_status
  ON bounty_claims (user_id, status, created_at);

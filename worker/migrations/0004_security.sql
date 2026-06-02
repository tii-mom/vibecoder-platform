-- Security Additions
-- Migration 0004

CREATE TABLE IF NOT EXISTS auth_nonces (
  nonce TEXT PRIMARY KEY,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS used_chain_txs (
  tx_hash TEXT PRIMARY KEY,
  user_id TEXT,
  purpose TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

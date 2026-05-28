-- Agentic Wallet + Automation Rules
-- Migration 0003

CREATE TABLE IF NOT EXISTS agentic_wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  wallet_address TEXT UNIQUE,
  operator_key_hash TEXT,
  status TEXT DEFAULT 'PENDING', -- PENDING/DEPLOYED/REVOKED
  dashboard_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deployed_at TEXT
);

CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  rule_type TEXT,              -- AUTO_SPARK / AUTO_VOTE / AUTO_EXIT / MONITOR
  project_id TEXT,              -- NULL = all projects
  condition_json TEXT,          -- { "minScore": 85, "maxAmount": 10, "stage": 1 }
  action_json TEXT,             -- { "action": "SPARK", "amount": 10 }
  enabled INTEGER DEFAULT 1,
  last_executed TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS copilot_queries (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  query TEXT,
  response TEXT,
  vc_cost REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agentic_logs (
  id TEXT PRIMARY KEY,
  wallet_id TEXT,
  action TEXT,                 -- SPARK / VOTE / EXIT / TRANSFER
  details TEXT,
  tx_hash TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

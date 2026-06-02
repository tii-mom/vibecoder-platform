-- Launch on-chain lifecycle tables
-- Migration 0004

CREATE TABLE IF NOT EXISTS launch_contracts (
  launch_id TEXT PRIMARY KEY,
  campaign_address TEXT,
  token_address TEXT,
  vesting_address TEXT,
  governance_address TEXT,
  network TEXT DEFAULT 'testnet',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vesting_rounds (
  id TEXT PRIMARY KEY,
  launch_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  locked REAL NOT NULL,
  price_threshold TEXT NOT NULL,
  current_price TEXT NOT NULL,
  matched INTEGER DEFAULT 0,
  matched_at TEXT,
  unlocked INTEGER DEFAULT 0,
  unlocked_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (launch_id, round)
);

CREATE TABLE IF NOT EXISTS operations_requests (
  id TEXT PRIMARY KEY,
  launch_id TEXT NOT NULL,
  requester_wallet TEXT,
  amount REAL NOT NULL,
  amount_unit TEXT DEFAULT 'PERCENT',
  purpose TEXT NOT NULL,
  yes_weight REAL DEFAULT 0,
  no_weight REAL DEFAULT 0,
  yes_count INTEGER DEFAULT 0,
  no_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  tx_hash TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS onchain_spark_records (
  id TEXT PRIMARY KEY,
  launch_id TEXT NOT NULL,
  wallet TEXT NOT NULL,
  amount REAL NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',
  confirmed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vesting_rounds_launch_id ON vesting_rounds (launch_id, round);
CREATE INDEX IF NOT EXISTS idx_operations_requests_launch_id ON operations_requests (launch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_onchain_spark_records_launch_id ON onchain_spark_records (launch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_onchain_spark_records_wallet ON onchain_spark_records (wallet);

INSERT OR IGNORE INTO launch_contracts (launch_id, campaign_address, token_address, vesting_address, governance_address) VALUES
('spark-1', 'EQCampaignOmniSocialMock001', 'EQTokenOmniSocialMock001', 'EQVestingOmniSocialMock001', 'EQGovernanceOmniSocialMock001'),
('spark-2', 'EQCampaignCodeVibeMock002', 'EQTokenCodeVibeMock002', 'EQVestingCodeVibeMock002', 'EQGovernanceCodeVibeMock002'),
('spark-3', 'EQCampaignTrendBotMock003', 'EQTokenTrendBotMock003', 'EQVestingTrendBotMock003', 'EQGovernanceTrendBotMock003');

INSERT OR IGNORE INTO operations_requests (id, launch_id, requester_wallet, amount, amount_unit, purpose, yes_weight, no_weight, yes_count, no_count, status, expires_at) VALUES
('ops-1', 'spark-1', 'VibeDev_88ff', 1.2, 'PERCENT', 'X 平台营销推广', 45, 8, 45, 8, 'passed', '2026-05-22T10:00:00Z'),
('ops-2', 'spark-1', 'VibeDev_88ff', 0.8, 'PERCENT', '社区AMA活动奖品', 52, 3, 52, 3, 'passed', '2026-05-25T10:00:00Z'),
('ops-3', 'spark-1', 'VibeDev_88ff', 2.5, 'PERCENT', '审计费用', 18, 12, 18, 12, 'active', '2026-06-08T10:00:00Z');

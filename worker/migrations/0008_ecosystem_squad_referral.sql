-- ============================================================
-- Migration 0008: VibeCoder 3.0 Phase 1 Schema Upgrade
-- Fixes P0 issues: no ADD COLUMN UNIQUE, INTEGER amounts, adds missing columns
-- ============================================================

-- 1. Add missing display columns to launches (used by frontend/search)
ALTER TABLE launches ADD COLUMN project_code TEXT;
ALTER TABLE launches ADD COLUMN token_symbol TEXT;
ALTER TABLE launches ADD COLUMN agent_ticker TEXT;
ALTER TABLE launches ADD COLUMN title TEXT;
ALTER TABLE launches ADD COLUMN category TEXT;

-- 2. ALTER TABLE for ecosystem/launch type fields (plain columns, index later)
ALTER TABLE launches ADD COLUMN ecosystem_id TEXT;
ALTER TABLE launches ADD COLUMN launch_type TEXT DEFAULT 'PROJECT_TOKEN';
ALTER TABLE launches ADD COLUMN parent_token_address TEXT;
ALTER TABLE launches ADD COLUMN parent_token_symbol TEXT;

-- 3. Backer share + policy as INTEGER (percentage * 100 = nano-scale precision)
ALTER TABLE launches ADD COLUMN backer_token_share INTEGER DEFAULT 3500;
ALTER TABLE launches ADD COLUMN token_policy_status TEXT DEFAULT 'approved';
ALTER TABLE launches ADD COLUMN token_policy_reason TEXT;

-- 4. NO_TOKEN deliverable fields
ALTER TABLE launches ADD COLUMN deliverable_type TEXT;
ALTER TABLE launches ADD COLUMN deliverable_desc TEXT;
ALTER TABLE launches ADD COLUMN delivery_date TEXT;
ALTER TABLE launches ADD COLUMN dispute_rules TEXT;

-- 5. Backfill project_code for existing launches
UPDATE launches SET project_code = 'VC-L-' || substr('00000' || rowid, -6, 6) WHERE project_code IS NULL;

-- 6. Backfill existing fields from mock data (agent_ticker, etc.)
UPDATE launches SET token_symbol = 'OSA', agent_ticker = 'OSA', title = 'OmniSocial ($OSA) 2.0 升级星火共建', category = '社交' WHERE id = 'spark-1';
UPDATE launches SET token_symbol = 'CVA', agent_ticker = 'CVA', title = 'CodeVibe Auditor 安全服务网络星火共建', category = '监控' WHERE id = 'spark-2';
UPDATE launches SET token_symbol = 'TBP', agent_ticker = 'TBP', title = 'TrendBot Pro Quant 量化智能体', category = '交易工具' WHERE id = 'spark-3';
UPDATE launches SET token_symbol = 'MGAI', agent_ticker = 'MGAI', title = '$MGAI 机器人竞技场对决星火共建计划', category = '创作工具' WHERE id = 'spark-4';

-- 7. Create indexes (UNIQUE via index, not via ADD COLUMN)
CREATE UNIQUE INDEX IF NOT EXISTS idx_launches_code ON launches(project_code);
CREATE INDEX IF NOT EXISTS idx_launches_ecosystem ON launches(ecosystem_id);
CREATE INDEX IF NOT EXISTS idx_launches_type ON launches(launch_type);
CREATE INDEX IF NOT EXISTS idx_launches_token_symbol ON launches(token_symbol);
CREATE INDEX IF NOT EXISTS idx_launches_agent_ticker ON launches(agent_ticker);

-- 8. Creator Ecosystems (INTEGER amounts)
CREATE TABLE IF NOT EXISTS creator_ecosystems (
  id TEXT PRIMARY KEY,
  ecosystem_code TEXT NOT NULL,
  creator_wallet TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  hub_token_address TEXT,
  hub_token_symbol TEXT,
  status TEXT DEFAULT 'active',
  member_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ecosystems_code ON creator_ecosystems(ecosystem_code);
CREATE INDEX IF NOT EXISTS idx_ecosystems_creator ON creator_ecosystems(creator_wallet);

CREATE TABLE IF NOT EXISTS ecosystem_members (
  id TEXT PRIMARY KEY,
  ecosystem_id TEXT NOT NULL REFERENCES creator_ecosystems(id),
  wallet TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TEXT DEFAULT (datetime('now')),
  UNIQUE(ecosystem_id, wallet)
);

-- 9. Spark Squads (INTEGER amounts in nano units)
CREATE TABLE IF NOT EXISTS spark_squads (
  id TEXT PRIMARY KEY,
  squad_code TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES launches(id),
  creator_wallet TEXT NOT NULL,
  creator_name TEXT DEFAULT '',
  target_members INTEGER NOT NULL DEFAULT 3,
  target_amount_nano INTEGER NOT NULL DEFAULT 30000000000,
  current_amount_nano INTEGER DEFAULT 0,
  current_members INTEGER DEFAULT 0,
  expires_at TEXT NOT NULL,
  reward_text TEXT DEFAULT '早鸟积分+500，白名单额度加成',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_squads_code ON spark_squads(squad_code);
CREATE INDEX IF NOT EXISTS idx_squads_project ON spark_squads(project_id);
CREATE INDEX IF NOT EXISTS idx_squads_creator ON spark_squads(creator_wallet);

CREATE TABLE IF NOT EXISTS spark_squad_members (
  id TEXT PRIMARY KEY,
  squad_id TEXT NOT NULL REFERENCES spark_squads(id),
  wallet TEXT NOT NULL,
  spark_amount_nano INTEGER DEFAULT 0,
  joined_at TEXT DEFAULT (datetime('now')),
  UNIQUE(squad_id, wallet)
);

-- 10. Referral records (INTEGER reward amounts in nano units)
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  inviter_wallet TEXT NOT NULL,
  invitee_wallet TEXT NOT NULL,
  invitee_connected_at TEXT DEFAULT (datetime('now')),
  first_spark_project_id TEXT,
  first_spark_amount_nano INTEGER,
  first_spark_at TEXT,
  reward_status TEXT DEFAULT 'pending',
  reward_vc_nano INTEGER DEFAULT 50000000000,
  flagged_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_invitee ON referrals(invitee_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(reward_status);

-- 11. OnRamp UID verification (separate table, low reward)
CREATE TABLE IF NOT EXISTS onramp_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exchange TEXT NOT NULL,
  exchange_uid TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING_AUTO',
  reward_vc_nano INTEGER DEFAULT 50000000000,
  reward_badge TEXT DEFAULT 'crypto_starter',
  verified_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_onramp_user ON onramp_verifications(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_onramp_uid_per_exchange ON onramp_verifications(user_id, exchange);

-- 12. Telegram auth fields for users
ALTER TABLE users ADD COLUMN telegram_id INTEGER;
ALTER TABLE users ADD COLUMN telegram_username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);

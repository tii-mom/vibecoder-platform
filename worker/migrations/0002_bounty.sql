-- 赏金任务系统 + 平台合约表
-- Migration 0002

-- 赏金任务表
CREATE TABLE IF NOT EXISTS bounty_tasks (
  id TEXT PRIMARY KEY,
  creator_id TEXT,
  creator_type TEXT,           -- PROJECT / USER
  creator_tier INTEGER DEFAULT 0, -- 0=平台项目方(1万) 1=TON外部(10万) 2=非TON(50万)
  task_type TEXT,              -- FOLLOW_X / RETWEET / JOIN_TG / JOIN_DISCORD / SPARK / INVITE
  title TEXT,
  description TEXT,
  target_url TEXT,
  reward_amount REAL,
  reward_token TEXT DEFAULT 'VC',
  total_slots INT,
  completed_slots INT DEFAULT 0,
  vc_stake REAL,
  is_token_reward INTEGER DEFAULT 0,
  token_reward_chain TEXT,     -- TON/BSC/ETH/SOL
  token_reward_type TEXT,
  token_reward_amount REAL,
  status TEXT DEFAULT 'ACTIVE',
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 赏金提交记录
CREATE TABLE IF NOT EXISTS bounty_submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  user_id TEXT,
  status TEXT DEFAULT 'PENDING', -- PENDING/VERIFIED/REJECTED
  reward_vc REAL,
  reward_token TEXT,
  reward_amount REAL,
  claimed INTEGER DEFAULT 0,
  verified_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- VC 质押记录
CREATE TABLE IF NOT EXISTS bounty_stakes (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  creator_tier INTEGER DEFAULT 0,
  vc_amount REAL,
  locked_at TEXT,
  unlock_at TEXT,
  status TEXT DEFAULT 'ACTIVE'
);

-- 用户 VC 余额（机器人钱包待提取）
CREATE TABLE IF NOT EXISTS user_vc_balances (
  user_id TEXT PRIMARY KEY,
  pending_vc REAL DEFAULT 0,
  total_earned_vc REAL DEFAULT 0,
  updated_at TEXT
);

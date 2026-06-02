-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  ton_wallet TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Launch 项目表
CREATE TABLE IF NOT EXISTS launches (
  id TEXT PRIMARY KEY,
  owner_id TEXT,
  name TEXT,
  description TEXT,
  target_total REAL,       -- TON
  stage1_target REAL,
  stage1_rate REAL,        -- 每 TON 兑换代币数
  stage1_bonus REAL,
  stage2_target REAL,
  stage2_rate REAL,
  stage3_rate REAL,
  deploy_threshold REAL,   -- 55%
  raised_total REAL,
  status TEXT,             -- DRAFT/FUNDING/SUCCESS/LIVE/FAILED
  -- TON 分配（新模型 30/50/18/2）
  team_share REAL DEFAULT 30,       -- 30% 团队立即释放
  governance_share REAL DEFAULT 50, -- 50% 治理锁定
  project_share REAL DEFAULT 18,    -- 18% 项目方支配
  platform_fee_ton REAL DEFAULT 2,  -- 2% 平台费
  -- Token 分配（新模型 35/40/10/10/5）
  investor_token_share REAL DEFAULT 35,
  team_vesting_token_share REAL DEFAULT 40,
  ops_token_share REAL DEFAULT 10,
  platform_token_share REAL DEFAULT 10,
  lp_token_share REAL DEFAULT 5,
  deadline TEXT,
  token_deployed INTEGER DEFAULT 0,
  token_address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 平台合约地址表
CREATE TABLE IF NOT EXISTS platform_contracts (
  id TEXT PRIMARY KEY,
  contract_name TEXT UNIQUE,  -- VC_JETTON / FUND / STRATEGIC / EARLY_SUB / LAUNCH_FEE / TOKEN_LAUNCHER / ORACLE
  address TEXT,
  network TEXT DEFAULT 'testnet',
  deployed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 投资者记录
CREATE TABLE IF NOT EXISTS spark_records (
  id TEXT PRIMARY KEY,
  launch_id TEXT,
  user_id TEXT,
  amount REAL,             -- TON
  stage INTEGER,
  tokens REAL,             -- 获得的代币
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 治理投票提案
CREATE TABLE IF NOT EXISTS governance_proposals (
  id TEXT PRIMARY KEY,
  launch_id TEXT,
  amount REAL,
  purpose TEXT,
  yes_weight REAL DEFAULT 0,
  no_weight REAL DEFAULT 0,
  status TEXT,             -- ACTIVE/PASSED/REJECTED
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT
);

-- 投票记录
CREATE TABLE IF NOT EXISTS governance_votes (
  id TEXT PRIMARY KEY,
  proposal_id TEXT,
  user_id TEXT,
  weight REAL,             -- sqrt(持仓量)
  vote TEXT,               -- YES/NO
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 退出请求
CREATE TABLE IF NOT EXISTS exit_requests (
  id TEXT PRIMARY KEY,
  launch_id TEXT,
  user_id TEXT,
  redeemed_ton REAL,
  burned_tokens REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

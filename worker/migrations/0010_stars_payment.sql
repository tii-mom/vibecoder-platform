CREATE TABLE IF NOT EXISTS stars_payments (
    id TEXT PRIMARY KEY,               -- Telegram checkout_id
    user_id TEXT NOT NULL,             -- 用户 ID (tg_xxx)
    launch_id TEXT NOT NULL,           -- 支持的 Launch 项目 ID
    stars_amount INTEGER NOT NULL,     -- 星币数量
    ton_amount_nano INTEGER NOT NULL,  -- 兑换成 TON 的 nano 数额 (INTEGER)
    status TEXT NOT NULL,              -- PENDING_CALLBACK | PROCESSING | SUCCESS | FAILED
    onchain_tx_hash TEXT,              -- 链上交易 Hash
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 为避免查询退化，为用户、项目及状态建立索引
CREATE INDEX IF NOT EXISTS idx_stars_payments_user ON stars_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_stars_payments_launch ON stars_payments(launch_id);
CREATE INDEX IF NOT EXISTS idx_stars_payments_status ON stars_payments(status);

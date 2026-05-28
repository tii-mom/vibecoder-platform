-- ALTER TABLE bounty_submissions to support exchange uid and screenshot proofs
ALTER TABLE bounty_submissions ADD COLUMN exchange_uid TEXT;
ALTER TABLE bounty_submissions ADD COLUMN screenshot_url TEXT;

-- Seed initial exchange registry bounty tasks
INSERT OR IGNORE INTO bounty_tasks (id, creator_id, creator_type, creator_tier, task_type, title, description, target_url, reward_amount, reward_token, total_slots, completed_slots, status)
VALUES
('bounty-binance-reg', 'admin', 'PROJECT', 0, 'EXCHANGE_REG', '注册币安 (Binance) 并首次充值', '注册币安账户，完成 KYC 并进行 C2C 充值（最低 10 USDT 或 1.5 TON）。提交您的币安 UID 与充值截图凭证。', 'https://www.binance.com', 1000.0, 'VC', 10000, 0, 'ACTIVE'),
('bounty-okx-reg', 'admin', 'PROJECT', 0, 'EXCHANGE_REG', '注册欧易 (OKX) 并首次充值', '注册欧易账户，完成 KYC 并进行 C2C 充值（最低 10 USDT 或 1.5 TON）。提交您的欧易 UID 与充值截图凭证。', 'https://www.okx.com', 1000.0, 'VC', 10000, 0, 'ACTIVE'),
('bounty-bitget-reg', 'admin', 'PROJECT', 0, 'EXCHANGE_REG', '注册 Bitget 并首次充值', '注册 Bitget 账户，完成 KYC 并进行 C2C 充值（最低 10 USDT 或 1.5 TON）。提交您的 Bitget UID 与充值截图凭证。', 'https://www.bitget.com', 1000.0, 'VC', 10000, 0, 'ACTIVE');

-- 向治理提案表添加类型字段，区分资金提取与运营代币池申请
ALTER TABLE governance_proposals ADD COLUMN type TEXT DEFAULT 'ton_withdrawal';

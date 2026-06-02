-- 插入初始 Mock 项目数据
INSERT OR REPLACE INTO launches (id, owner_id, name, description, target_total, stage1_target, stage1_rate, stage1_bonus, stage2_target, stage2_rate, stage3_rate, deploy_threshold, raised_total, status, deadline, token_deployed) VALUES 
('spark-1', 'VibeDev_88ff', 'OmniSocial ($OSA) 2.0 升级星火共建', '本星火计划旨在募集 5,000 TON 以实现深度推特自主阅读和全自动 Farcaster 智能分发功能。', 5000, 1500, 100, 10, 3000, 80, 60, 0.55, 3250, 'active', '2026-06-15T00:00:00Z', 1),
('spark-2', 'VibeDev_bc67', 'CodeVibe Auditor 安全服务网络星火共建', '寻找募集 10,000 TON，用于租赁 GPU 算力及微调包含 FunC 专有安全漏洞特征的大模型。', 10000, 3000, 20, 5, 6000, 15, 10, 0.55, 4100, 'active', '2026-06-25T00:00:00Z', 1),
('spark-3', 'VibeDev_0a8b', 'TrendBot Pro Quant 量化智能体', '智能分析并跟踪链上热点，并自动化分配交易产出分成。', 8000, 2000, 50, 0, 4000, 40, 30, 0.55, 5200, 'success', '2026-05-20T00:00:00Z', 1),
('spark-4', 'VibeDev_creator', 'CodeSage AI 智能代理辅助测试', '专注于全自动化进行沙盒环境测试数据抓取与 API 防溢出审计。', 12000, 4000, 30, 0, 8000, 25, 20, 0.55, 2500, 'active', '2026-07-10T00:00:00Z', 0);

-- 插入初始 Mock 提案数据
INSERT OR REPLACE INTO governance_proposals (id, launch_id, amount, purpose, yes_weight, no_weight, status, expires_at) VALUES 
('prop-1', 'spark-1', 500.0, '服务器扩容 + API 性能优化，用于支持本月激增的社交裂变用户', 35.0, 10.0, 'active', '2026-05-30T10:00:00Z'),
('prop-2', 'spark-1', 300.0, '前端 UI 重构与移动端适配升级，提升 Web 交互的 Aha Moment 体验', 120.0, 15.0, 'passed', '2026-05-22T10:00:00Z'),
('prop-3', 'spark-1', 800.0, '赞助线下加密社区极客大会与海外 KOL 市场宣发推广', 20.0, 85.0, 'rejected', '2026-05-17T10:00:00Z'),
('prop-4', 'spark-2', 600.0, '扩展 TON 智能合约静态审计规则库，覆盖最新 Tolk 编译器特性', 45.0, 5.0, 'active', '2026-05-31T10:00:00Z');

-- Migration 0011: AI Webhook Milestone Auto-Unlock Tables and Mocks
-- =================================================================

CREATE TABLE IF NOT EXISTS launch_milestones (
    id TEXT PRIMARY KEY,
    launch_id TEXT NOT NULL,
    milestone_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    release_ratio REAL NOT NULL,
    status TEXT NOT NULL, -- PENDING | SUBMITTED | AI_REVIEW_PASSED | CHALLENGE_PERIOD | UNLOCKED | DISPUTED | DAO_ARBITRATION
    deliverable_url TEXT,
    challenge_expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(launch_id, milestone_index)
);

CREATE INDEX IF NOT EXISTS idx_launch_milestones_launch ON launch_milestones(launch_id);
CREATE INDEX IF NOT EXISTS idx_launch_milestones_status ON launch_milestones(status);

-- Insert initial mock milestones for active launches (spark-1, spark-2, spark-3, spark-4)
-- spark-1
INSERT OR REPLACE INTO launch_milestones (id, launch_id, milestone_index, title, release_ratio, status, deliverable_url, challenge_expires_at) VALUES
('m-spark-1-0', 'spark-1', 0, '设计架构与推特自主阅读核心接口定义', 0.20, 'UNLOCKED', 'https://github.com/osa/design-spec', NULL),
('m-spark-1-1', 'spark-1', 1, '全自动 Farcaster 智能分发模块实现', 0.30, 'CHALLENGE_PERIOD', 'https://github.com/osa/farcaster-publisher', '2026-05-31T15:00:00Z'),
('m-spark-1-2', 'spark-1', 2, 'AI 深度阅读理解微调模型对接', 0.30, 'PENDING', NULL, NULL),
('m-spark-1-3', 'spark-1', 3, '2.0 升级全功能集成与最终交付验收', 0.20, 'PENDING', NULL, NULL);

-- spark-2
INSERT OR REPLACE INTO launch_milestones (id, launch_id, milestone_index, title, release_ratio, status, deliverable_url, challenge_expires_at) VALUES
('m-spark-2-0', 'spark-2', 0, 'GPU 算力集群部署与吞吐压力测试', 0.25, 'UNLOCKED', 'https://github.com/codevibe/gpu-cluster', NULL),
('m-spark-2-1', 'spark-2', 1, 'FunC 漏洞特征语料库清洗与生成', 0.25, 'PENDING', NULL, NULL),
('m-spark-2-2', 'spark-2', 2, '大模型静态微调与漏洞检测初评估', 0.25, 'PENDING', NULL, NULL),
('m-spark-2-3', 'spark-2', 3, '安全服务网络公测版本上线与集成对接', 0.25, 'PENDING', NULL, NULL);

-- spark-3
INSERT OR REPLACE INTO launch_milestones (id, launch_id, milestone_index, title, release_ratio, status, deliverable_url, challenge_expires_at) VALUES
('m-spark-3-0', 'spark-3', 0, '链上数据实时解析引擎与索引器开发', 0.30, 'UNLOCKED', 'https://github.com/trendbot/indexer', NULL),
('m-spark-3-1', 'spark-3', 1, '量化交易智能代理自动化分配模块', 0.40, 'UNLOCKED', 'https://github.com/trendbot/agents', NULL),
('m-spark-3-2', 'spark-3', 2, '收益分成合约上线及第一批公测交易对运行', 0.30, 'UNLOCKED', 'https://github.com/trendbot/revenue-sharing', NULL);

-- spark-4
INSERT OR REPLACE INTO launch_milestones (id, launch_id, milestone_index, title, release_ratio, status, deliverable_url, challenge_expires_at) VALUES
('m-spark-4-0', 'spark-4', 0, '沙盒测试环境搭建及 API 数据爬虫脚本', 0.30, 'PENDING', NULL, NULL),
('m-spark-4-1', 'spark-4', 1, '防溢出审计静态检测规则链适配', 0.40, 'PENDING', NULL, NULL),
('m-spark-4-2', 'spark-4', 2, '全自动沙盒审计报告生成及通知机器人集成', 0.30, 'PENDING', NULL, NULL);

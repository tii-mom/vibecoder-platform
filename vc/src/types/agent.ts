export interface Agent {
  id: string;
  name: string;
  ticker: string;
  description: string;
  creator: string;
  walletAddress?: string;
  status: 'draft' | 'funding' | 'running' | 'paused';
  category: '数据分析' | '交易工具' | '社交' | '监控' | '基础设施' | '创作工具' | 'DeFi';
  capabilities: string[];
  performance: {
    roi: number; // Annualized or Total return
    winRate?: number;
    tvl?: number;
    gasUsed?: number;
  };
  revenueModel: string;
  githubUrl?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface SparkProject {
  id: string;
  agentId: string;
  agentName: string;
  agentTicker: string;
  title: string;
  description: string;
  goalAmount: number; // in TON
  raisedAmount: number; // in TON
  investorCount: number;
  minInvestment: number; // in TON
  status: 'active' | 'success' | 'failed' | 'listed';
  endTime: string;
  creatorAddress: string;
  tokenPrice: number; // 1 AgentToken = X TON
  progress: number; // percentage
  backers: Array<{
    address: string;
    amount: number;
    timestamp: string;
  }>;
  totalSupply?: number;
  tokenomics?: Array<{ name: string; value: number; color: string }>;
  vesting?: string;
  // Extended fields for Exploration/Details
  category?: '数据分析' | '交易工具' | '社交' | '监控' | '基础设施' | '创作工具' | 'DeFi';
  tags?: string[];
  upvotes?: number;
  commentsCount?: number;
  comments?: Array<{
    id: string;
    author: string;
    avatar?: string;
    content: string;
    timestamp: string;
  }>;
  assuranceMode?: 'staked' | 'unstaked';
  milestones?: Array<{
    title: string;
    condition: string;
    releaseRadio: number; // percent e.g. 25
    status: 'pending' | 'completed' | 'ongoing';
  }>;
  useOfFunds?: Array<{
    name: string;
    percentage: number;
    desc: string;
  }>;
  teamDesc?: string;
  onchainVerifyStatus?: 'verified' | 'unverified';
}

export interface TeamMember {
  address: string;
  amount: number;
  timestamp: string;
}

export interface TeamSpark {
  id: string;
  projectId: string;
  creatorAddress: string;
  creatorName: string;
  targetAmount: number;
  currentAmount: number;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'success' | 'expired';
  members: TeamMember[];
}

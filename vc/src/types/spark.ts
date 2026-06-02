export type LaunchType = 'NO_TOKEN' | 'HUB_TOKEN' | 'PROJECT_TOKEN';

export type TokenPolicyStatus = 'approved' | 'review' | 'denied';

export interface CreatorEcosystem {
  id: string;
  ecosystemCode: string;
  creatorWallet: string;
  name: string;
  description: string;
  hubTokenAddress?: string;
  hubTokenSymbol?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  memberCount: number;
}

export interface SparkProject {
  id: string;
  projectCode: string;
  agentId: string;
  agentName: string;
  agentTicker: string;
  title: string;
  description: string;
  goalAmount: number;
  raisedAmount: number;
  investorCount: number;
  minInvestment: number;
  status: 'active' | 'success' | 'failed' | 'listed' | 'DRAFT' | 'draft';
  endTime: string;
  creatorAddress: string;
  tokenPrice: number;
  progress: number;
  backers: Array<{
    address: string;
    amount: number;
    timestamp: string;
  }>;
  totalSupply?: number;
  tokenomics?: Array<{ name: string; value: number; color: string }>;
  vesting?: string;
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
    id?: string;
    launchId?: string;
    milestoneIndex?: number;
    title: string;
    condition?: string;
    releaseRadio?: number;
    releaseRatio?: number;
    status: 'pending' | 'completed' | 'ongoing' | 'PENDING' | 'SUBMITTED' | 'AI_REVIEW_PASSED' | 'CHALLENGE_PERIOD' | 'UNLOCKED' | 'DISPUTED' | 'DAO_ARBITRATION';
    deliverableUrl?: string;
    challengeExpiresAt?: string;
  }>;
  useOfFunds?: Array<{
    name: string;
    percentage: number;
    desc: string;
  }>;
  teamDesc?: string;
  onchainVerifyStatus?: 'verified' | 'unverified';
  communityPhotoUrl?: string;
  communityQrCodeUrl?: string;
  communityGroupLink?: string;
  announcements?: Array<{
    id: string;
    title: string;
    content: string;
    timestamp: string;
  }>;
  githubUrl?: string;
  websiteUrl?: string;
  extraPerks?: string;
  aiBusinessPitch?: string;
  ecosystemId?: string;
  launchType?: LaunchType;
  parentTokenAddress?: string;
  parentTokenSymbol?: string;
  backerTokenShare?: number;
  tokenPolicyStatus?: TokenPolicyStatus;
  tokenPolicyReason?: string;
  syncStatus?: 'pending_sync' | 'synced' | 'failed';
  platformFeeRate?: number;
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

export interface SparkSquad {
  id: string;
  squadCode: string;
  projectId: string;
  creatorWallet: string;
  creatorName: string;
  targetMembers: number;
  targetAmount: number;
  currentAmount: number;
  currentMembers: number;
  expiresAt: string;
  rewardText: string;
  status: 'active' | 'success' | 'expired';
  createdAt: string;
}

export interface SparkSquadMember {
  wallet: string;
  name?: string;
  sparkAmount: number;
  joinedAt: string;
}

export interface ReferralRecord {
  id: string;
  inviterWallet: string;
  inviteeWallet: string;
  inviteeConnectedAt: string;
  firstSparkProjectId?: string;
  firstSparkAmount?: number;
  firstSparkAt?: string;
  rewardStatus: 'pending' | 'earned' | 'claimed' | 'flagged';
  rewardVcAmount: number;
  flaggedReason?: string;
  createdAt: string;
}

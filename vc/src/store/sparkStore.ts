import { create } from 'zustand';
import { SparkProject, TokenInfo, TeamSpark, CreatorEcosystem, LaunchType, SparkSquad, ReferralRecord } from '../types';
import { useNotificationStore } from './notificationStore';
import { getWalletJwt } from '../services/telegramAuth';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

let _codeCounter = 1000;
function generateProjectCode(): string {
  _codeCounter++;
  return `VC-L-${String(_codeCounter).padStart(6, '0')}`;
}
function generateSquadCode(): string {
  const seq = Math.floor(Math.random() * 900000) + 100000;
  return `VC-F-${seq}`;
}
function generateEcosystemCode(): string {
  const seq = Math.floor(Math.random() * 900000) + 100000;
  return `VC-E-${seq}`;
}

interface SparkState {
  projects: SparkProject[];
  tokens: TokenInfo[];
  teams: TeamSpark[];
  ecosystems: CreatorEcosystem[];
  squads: SparkSquad[];
  referrals: ReferralRecord[];
  addProject: (project: Omit<SparkProject, 'id' | 'projectCode' | 'raisedAmount' | 'investorCount' | 'progress' | 'backers' | 'status'> & {
    category?: '数据分析' | '交易工具' | '社交' | '监控' | '基础设施' | '创作工具' | 'DeFi';
    tags?: string[];
    assuranceMode?: 'staked' | 'unstaked';
    milestones?: Array<{ title: string; condition: string; releaseRadio: number; status: 'pending' | 'completed' | 'ongoing' }>;
    useOfFunds?: Array<{ name: string; percentage: number; desc: string }>;
    teamDesc?: string;
    launchType?: LaunchType;
    ecosystemId?: string;
  }) => SparkProject;
  investInProject: (projectId: string, amount: number, address: string) => boolean;
  getProjectById: (id: string) => SparkProject | undefined;
  upvoteProject: (projectId: string) => void;
  addComment: (projectId: string, content: string, author: string) => void;
  buyToken: (tokenId: string, amountTON: number, address: string) => boolean;
  sellToken: (tokenId: string, tokenAmount: number, address: string) => boolean;
  advanceProjectMilestone: (projectId: string, index: number, targetStatus: 'pending' | 'ongoing' | 'completed') => void;
  listProjectOnAMM: (projectId: string) => boolean;
  createTeamSpark: (projectId: string, creatorAddress: string, creatorName: string, targetAmount: number, initialContribution: number) => TeamSpark;
  joinTeamSpark: (teamId: string, address: string, amount: number) => boolean;
  getTeamById: (teamId: string) => TeamSpark | undefined;
  updateProjectDetails: (projectId: string, updates: Partial<SparkProject>) => void;
  createEcosystem: (name: string, description: string, creatorWallet: string) => Promise<CreatorEcosystem>;
  getEcosystemsByCreator: (creatorWallet: string) => CreatorEcosystem[];
  createSquad: (projectId: string, creatorWallet: string, creatorName: string, targetMembers: number, targetAmount: number) => Promise<SparkSquad>;
  joinSquad: (squadId: string, walletAddress: string, amount: number) => Promise<boolean>;
  loadSquads: (projectId: string) => Promise<void>;
  addReferral: (inviterWallet: string, inviteeWallet: string) => Promise<boolean>;
  loadReferrals: (wallet: string) => Promise<void>;
}

const mockProjects: SparkProject[] = [
  {
    id: "spark-1",
    projectCode: "SPARK-OSA-001",
    agentId: "agent-3",
    agentName: "OmniSocial Influencer",
    agentTicker: "OSA",
    title: "OmniSocial ($OSA) 2.0 升级星火共建",
    description: "本星火计划旨在募集 5,000 TON 以实现深度推特自主阅读和全自动 Farcaster 智能分发功能。支持者将按 1 TON = 100 OSA 的固定比例在活动结束后自动获得 $OSA 创世代币分配权，享受整个 AI 网红全网赞助金额的 70% 自动划拨分配。",
    goalAmount: 5000,
    raisedAmount: 3250,
    investorCount: 84,
    minInvestment: 5,
    status: 'active',
    endTime: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
    creatorAddress: "VibeDev_88ff",
    tokenPrice: 0.01,
    progress: 65,
    category: "社交",
    tags: ["#TON", "#AI", "#网红", "#智能分发"],
    upvotes: 148,
    commentsCount: 3,
    comments: [
      { id: "c1", author: "TonyTon", content: "这个自运行网红智能体在 Telegram 上的表现太惊艳了！直接星火共建支持！", timestamp: "2026-05-26T14:00:00Z" },
      { id: "c2", author: "VibeMaster", content: "期待社交分账比例的实现，这才是真正自治的 Agent 模型。", timestamp: "2026-05-26T18:30:00Z" },
      { id: "c3", author: "ApeDegen", content: "早期参与了，期待代币分配！", timestamp: "2026-05-27T02:11:00Z" }
    ],
    assuranceMode: "staked",
    milestones: [
      { title: "核心推特交互升级", condition: "跑通完全自主推文抓取核心回路", releaseRadio: 25, status: 'completed' },
      { title: "独立 Farcaster 共识", condition: "全自动化发布与链上信誉计算", releaseRadio: 25, status: 'ongoing' },
      { title: "多链联签分配分流", condition: "通过智能代扣税分账池分配共建成员", releaseRadio: 30, status: 'pending' },
      { title: "全生态智能体自治", condition: "无需人工介入的主干网永续自进化", releaseRadio: 20, status: 'pending' }
    ],
    useOfFunds: [
      { name: "GPU / API 算力池", percentage: 40, desc: "用于支持 LLM 动态自驱动阅读 and 内容流创作" },
      { name: "多签合约代码安全审计", percentage: 20, desc: "由专业的 CodeVibe 进行安全验证" },
      { name: "首期流动金做市 (AMM)", percentage: 30, desc: "星火共建完成后初始注入 Launchpad 储备" },
      { name: "团队日常研发运维", percentage: 10, desc: "确保机器人突发宕机全自动恢复" }
    ],
    teamDesc: "Omni Labs 早期极客小队，拥有 4 年智能合约设计与自然语言处理调优经验。核心成员毕业于清华大学交叉信息院。",
    onchainVerifyStatus: "verified",
    extraPerks: "1. 早期支持者享受 70% 赞助分配分润比例；2. 赠送 OmniSocial 订阅高级会员年卡一张",
    backers: [
      { address: "EQD4...7fA3", amount: 500, timestamp: "2026-05-26T12:00:00Z" },
      { address: "EQB2...11p2", amount: 200, timestamp: "2026-05-27T01:30:00Z" },
      { address: "EQC9...99xY", amount: 1000, timestamp: "2026-05-27T10:45:00Z" }
    ]
  },
  {
    id: "spark-2",
    projectCode: "SPARK-CVA-002",
    agentId: "agent-5",
    agentName: "CodeVibe Auditor",
    agentTicker: "CVA",
    title: "CodeVibe Auditor 安全服务网络星火共建启动",
    description: "寻找募集 10,000 TON，用于租赁 GPU 算力及微调包含 FunC 专有安全漏洞特征的私有大语言模型。所有星火共建参与者将共同按比例获取该审计 Agent 每日产生的商业分配分成包（代币 $CVA 折扣返还）。",
    goalAmount: 10000,
    raisedAmount: 4100,
    investorCount: 42,
    minInvestment: 10,
    status: 'active',
    endTime: new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString(),
    creatorAddress: "VibeDev_bc67",
    tokenPrice: 0.005,
    progress: 41,
    category: "监控",
    tags: ["#TON", "#FunC", "#审计", "#安全"],
    upvotes: 95,
    commentsCount: 2,
    comments: [
      { id: "c1", author: "ByteBeast", content: "这个静态扫描非常硬核，我已经用他们开发者中心的沙箱翻译了几十行，效果很好！", timestamp: "2026-05-26T15:00:00Z" },
      { id: "c2", author: "DegenC", content: "安全审计在 TON 生态很有前景，太多的重放漏洞和流溢出了。", timestamp: "2026-05-26T22:18:00Z" }
    ],
    assuranceMode: "staked",
    milestones: [
      { title: "FunC 专有脆弱特征库", condition: "整理 50+ 经典漏洞静态编译特征", releaseRadio: 30, status: 'completed' },
      { title: "沙箱仿真检测机制", condition: "在内部模拟虚拟机部署执行检查", releaseRadio: 30, status: 'ongoing' },
      { title: "公开免费服务 API", condition: "为所有 TON 开发者提供自动化漏洞审计接口", releaseRadio: 20, status: 'pending' },
      { title: "资产自惩罚多签保单", condition: "建立赔付准备金，为投保项目承保", releaseRadio: 20, status: 'pending' }
    ],
    useOfFunds: [
      { name: "私有漏洞大模型训练", percentage: 50, desc: "采购高性能专有 GPU 算力来进行模型微调" },
      { name: "漏洞库赏金计划", percentage: 30, desc: "面向全球白帽子召集 FunC 典型漏洞方案" },
      { name: "运营推广及节点开支", percentage: 20, desc: "部署多点冗余静态扫描器，加速处理速度" }
    ],
    teamDesc: "由数名原以太坊顶级合约审计小队与 TON 核心研究员联合发起的区块链链上卫士节点。",
    onchainVerifyStatus: "verified",
    backers: [
      { address: "EQA1...88fW", amount: 1200, timestamp: "2026-05-25T14:22:00Z" },
      { address: "EQD7...22gL", amount: 500, timestamp: "2026-05-26T18:10:00Z" }
    ]
  },
  {
    id: "spark-3",
    projectCode: "SPARK-NFR-003",
    agentId: "agent-1",
    agentName: "TrendBot Pro",
    agentTicker: "TBP",
    title: "$TBP 自动套利多功能量化机器人星火共建",
    description: "已成功募完 8,000 TON！代币已被全量发放并可在 Launchpad 内部根据 AMM 回购算法自由交易。《TrendBot Pro》已正式开启自动分配策略。",
    goalAmount: 8000,
    raisedAmount: 8000,
    investorCount: 195,
    minInvestment: 1,
    status: 'listed',
    endTime: "2026-05-20T12:00:00Z",
    creatorAddress: "VibeDev_0a8b",
    tokenPrice: 0.015,
    progress: 100,
    category: "交易工具",
    tags: ["#套利", "#量化", "#AMM", "#高频"],
    upvotes: 212,
    commentsCount: 1,
    comments: [
      { id: "c1", author: "ApeBacker", content: "已经开始回流分配了，分配表现目前保持在百分之十几，非常好！", timestamp: "2026-05-21T09:00:00Z" }
    ],
    assuranceMode: "staked",
    milestones: [
      { title: "核心策略布控", condition: "完成网格高频在测试网的 100 轮测试", releaseRadio: 25, status: 'completed' },
      { title: "主网实仓接入", condition: "成功建立 50,000 U 流动储备套利", releaseRadio: 25, status: 'completed' },
      { title: "智能防割多签升级", condition: "完成由 3 个独立保险节点的多签校验", releaseRadio: 30, status: 'completed' },
      { title: "全网自动分配路由", condition: "每日运营产出 70% 直达持有代币的用户钱包", releaseRadio: 20, status: 'completed' }
    ],
    useOfFunds: [
      { name: "量化套利储备金", percentage: 70, desc: "直接作为主力做市流动资金捕捉跨 DEX 价差" },
      { name: "安全保险多签质押", percentage: 15, desc: "存入多签金库，防范爆仓等突发事故" },
      { name: "节点及 API 开支", percentage: 15, desc: "租赁高性能超高速专线节点降低网络延迟" }
    ],
    teamDesc: "10 年高频量化基金资深架构团队，全自动交易吞吐引擎搭建者。",
    onchainVerifyStatus: "verified",
    extraPerks: "1. 永久免费接入 TrendBot Pro 自动套利策略；2. 赠送专属高频专线 API 额度 1,000,000 次/月。",
    backers: [
      { address: "EQD4...7fA3", amount: 1000, timestamp: "2026-05-18T10:00:00Z" },
      { address: "EQB2...11p2", amount: 500, timestamp: "2026-05-18T12:30:00Z" },
      { address: "EQC9...99xY", amount: 2000, timestamp: "2026-05-19T08:15:00Z" }
    ]
  },
  {
    id: "spark-4",
    projectCode: "SPARK-MGAI-004",
    agentId: "agent-2",
    agentName: "Matrix Game Oracle",
    agentTicker: "MGAI",
    title: "$MGAI 机器人竞技场对决星火共建计划",
    description: "$MGAI 星火共建完美收盘，机器人正代表全体持有人在 TON 链游大杀四方！代币上线二级 Launchpad 板块，交易火热！",
    goalAmount: 12000,
    raisedAmount: 12000,
    investorCount: 210,
    minInvestment: 5,
    status: 'listed',
    endTime: "2026-05-22T18:00:00Z",
    creatorAddress: "VibeDev_a9cc",
    tokenPrice: 0.02,
    progress: 100,
    category: "创作工具",
    tags: ["#GameFi", "#AI打金", "#博弈", "#预言机"],
    upvotes: 185,
    commentsCount: 0,
    comments: [],
    assuranceMode: "unstaked",
    milestones: [
      { title: "竞技智能体调教完成", condition: "通过对主流 5 款链游规则深度解析训练", releaseRadio: 30, status: 'completed' },
      { title: "打金博弈自动化上线", condition: "主网无感接入，首批 20 个人机实例运行", releaseRadio: 35, status: 'completed' },
      { title: "分配联合质押池部署", condition: "上线持有者分配再划拨流动性路由", releaseRadio: 35, status: 'completed' }
    ],
    useOfFunds: [
      { name: "流动性注入", percentage: 60, desc: "用于向各链游对战池提取代币质押并开始竞争" },
      { name: "AI 决策并发节点", percentage: 30, desc: "支持 100+ 同时挂线的高并发节点负载" },
      { name: "社群合议运营", percentage: 10, desc: "驱动自主广告展示及打金策略发布" }
    ],
    teamDesc: "由数名原腾讯/字节游戏 AI 算法总监自主孵化的自治打金智能体联盟。",
    onchainVerifyStatus: "verified",
    extraPerks: "1. Matrix Arena 创世打金角色皮肤空投；2. 打金分配权提权 20%。",
    backers: [
      { address: "EQD7...22gL", amount: 1500, timestamp: "2026-05-20T14:00:00Z" },
      { address: "EQA1...88fW", amount: 800, timestamp: "2026-05-21T11:45:00Z" }
    ]
  }
];

const generateChartData = (basePrice: number) => {
  const data = [];
  let currentPrice = basePrice;
  for (let i = 20; i >= 0; i--) {
    const change = (Math.random() - 0.46) * 0.08 * currentPrice;
    currentPrice = Math.max(0.001, currentPrice + change);
    const day = 27 - i;
    data.push({
      time: `05-${day > 0 ? String(day).padStart(2, '0') : String(30 + day).padStart(2, '0')}`,
      price: Number(currentPrice.toFixed(4)),
      volume: Math.floor(Math.random() * 8000 + 1500)
    });
  }
  return data;
};

const mockTokens: TokenInfo[] = [
  {
    id: "tok-1",
    name: "TrendBot Pro Token",
    symbol: "TBP",
    price: 0.0245,
    priceChange24h: 18.4,
    marketCap: 245000,
    volume24h: 42100,
    totalSupply: 10000000,
    circulatingSupply: 8000000,
    holderCount: 228,
    chartData: generateChartData(0.02)
  },
  {
    id: "tok-2",
    name: "Matrix Game Token",
    symbol: "MGAI",
    price: 0.0185,
    priceChange24h: -4.2,
    marketCap: 185000,
    volume24h: 18900,
    totalSupply: 10000000,
    circulatingSupply: 7500000,
    holderCount: 147,
    chartData: generateChartData(0.019)
  },
  {
    id: "tok-3",
    name: "DeFi Yield Token",
    symbol: "DYH",
    price: 0.0382,
    priceChange24h: 8.9,
    marketCap: 382000,
    volume24h: 62400,
    totalSupply: 10000000,
    circulatingSupply: 9000000,
    holderCount: 312,
    chartData: generateChartData(0.035)
  }
];

const mockTeams: TeamSpark[] = [
  {
    id: "team-1",
    projectId: "spark-1",
    creatorAddress: "EQA7_v1b3C0d3R_mock_creator_1",
    creatorName: "VibeDev_bc67",
    targetAmount: 20,
    currentAmount: 15,
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
    status: 'active',
    members: [
      { address: "EQA7_v1b3C0d3R_mock_creator_1", amount: 5, timestamp: new Date(Date.now() - 3600 * 1000).toISOString() },
      { address: "EQA7_v1b3C0d3R_mock_member_2", amount: 5, timestamp: new Date(Date.now() - 1800 * 1000).toISOString() },
      { address: "EQA7_v1b3C0d3R_mock_member_3", amount: 5, timestamp: new Date(Date.now() - 600 * 1000).toISOString() }
    ]
  },
  {
    id: "team-2",
    projectId: "spark-2",
    creatorAddress: "EQA7_v1b3C0d3R_mock_creator_2",
    creatorName: "DegenMaster",
    targetAmount: 50,
    currentAmount: 20,
    createdAt: new Date(Date.now() - 7200 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 22 * 3600 * 1000).toISOString(),
    status: 'active',
    members: [
      { address: "EQA7_v1b3C0d3R_mock_creator_2", amount: 10, timestamp: new Date(Date.now() - 7200 * 1000).toISOString() },
      { address: "EQA7_v1b3C0d3R_mock_member_4", amount: 10, timestamp: new Date(Date.now() - 3600 * 1000).toISOString() }
    ]
  }
];

export const useSparkStore = create<SparkState>((set, get) => {
  const loadStoredProjects = () => {
    if (typeof window === 'undefined') return mockProjects;
    const stored = localStorage.getItem('vc_projects');
    if (!stored) {
      if (import.meta.env.DEV) {
        localStorage.setItem('vc_projects', JSON.stringify(mockProjects));
      }
      return import.meta.env.DEV ? mockProjects : [];
    }
    return JSON.parse(stored);
  };

  const loadStoredTokens = () => {
    if (typeof window === 'undefined') return mockTokens;
    const stored = localStorage.getItem('vc_tokens');
    if (!stored) {
      if (import.meta.env.DEV) {
        localStorage.setItem('vc_tokens', JSON.stringify(mockTokens));
      }
      return import.meta.env.DEV ? mockTokens : [];
    }
    return JSON.parse(stored);
  };

  const loadStoredTeams = () => {
    if (typeof window === 'undefined') return mockTeams;
    const stored = localStorage.getItem('vc_teams');
    if (!stored) {
      if (import.meta.env.DEV) {
        localStorage.setItem('vc_teams', JSON.stringify(mockTeams));
      }
      return import.meta.env.DEV ? mockTeams : [];
    }
    return JSON.parse(stored);
  };

  const loadStoredEcosystems = () => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('vc_ecosystems');
    return stored ? JSON.parse(stored) : [];
  };

  const loadStoredSquads = () => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('vc_squads');
    return stored ? JSON.parse(stored) : [];
  };

  const loadStoredReferrals = () => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('vc_referrals');
    return stored ? JSON.parse(stored) : [];
  };

  return {
    projects: loadStoredProjects(),
    tokens: loadStoredTokens(),
    teams: loadStoredTeams(),
    ecosystems: loadStoredEcosystems(),
    squads: loadStoredSquads(),
    referrals: loadStoredReferrals(),

    addProject: (input) => {
      const id = `spark-${Date.now()}`;
      const newProject: SparkProject = {
        ...input,
        id,
        projectCode: `SPARK-${input.agentTicker}-${Date.now().toString(36).toUpperCase()}`,
        raisedAmount: 0,
        investorCount: 0,
        progress: 0,
        backers: [],
        status: 'active',
        upvotes: 1,
        commentsCount: 0,
        comments: [],
        category: input.category || '数据分析',
        tags: input.tags || ["#TON", "#AI"],
        assuranceMode: input.assuranceMode || 'unstaked',
        milestones: input.milestones || [
          { title: "阶段 1: 概念代码发布", condition: "提供可验证代码草稿", releaseRadio: 25, status: 'ongoing' },
          { title: "阶段 2: 链上部署测试", condition: "部署智能路由合约", releaseRadio: 25, status: 'pending' },
          { title: "阶段 3: 一级流动性池", condition: "注入 AMM 种子池", releaseRadio: 25, status: 'pending' },
          { title: "阶段 4: 分配持续派发", condition: "每日分配自动划转", releaseRadio: 25, status: 'pending' }
        ],
        useOfFunds: input.useOfFunds || [
          { name: "模型开发与调优", percentage: 50, desc: "租赁计算单元 fine-tune 模型" },
          { name: "合约审计与做市储备", percentage: 40, desc: "确保池子初始流动率并防止重放攻击" },
          { name: "运营以及带宽需求", percentage: 10, desc: "高频推送和多签警报带宽" }
        ],
        teamDesc: input.teamDesc || "VibeCoder 自治开发者联盟团队",
        onchainVerifyStatus: "unverified"
      };

      set((state) => {
        const nextProjects = [newProject, ...state.projects];
        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_projects', JSON.stringify(nextProjects));
        }
        return { projects: nextProjects };
      });
      return newProject;
    },

    investInProject: (projectId, amount, address) => {
      let isSuccess = false;
      set((state) => {
        const nextProjects = state.projects.map((proj) => {
          if (proj.id === projectId && proj.status === 'active') {
            const newRaised = proj.raisedAmount + amount;
            const newProgress = Math.min(100, Number(((newRaised / proj.goalAmount) * 100).toFixed(1)));
            const isFinished = newRaised >= proj.goalAmount;

            isSuccess = true;

            // Check if address is already a backer
            const existingBackerIdx = proj.backers.findIndex(b => b.address === address);
            let nextBackers = [...proj.backers];
            if (existingBackerIdx !== -1) {
              nextBackers[existingBackerIdx] = {
                ...nextBackers[existingBackerIdx],
                amount: nextBackers[existingBackerIdx].amount + amount,
                timestamp: new Date().toISOString()
              };
            } else {
              nextBackers = [{ address, amount, timestamp: new Date().toISOString() }, ...nextBackers];
            }

            return {
              ...proj,
              raisedAmount: newRaised,
              progress: newProgress,
              investorCount: existingBackerIdx !== -1 ? proj.investorCount : proj.investorCount + 1,
              status: isFinished ? 'success' as const : 'active' as const,
              backers: nextBackers
            };
          }
          return proj;
        });

        if (isSuccess && typeof window !== 'undefined') {
          localStorage.setItem('vc_projects', JSON.stringify(nextProjects));
        }
        return { projects: nextProjects };
      });
      return isSuccess;
    },

    getProjectById: (id) => {
      return get().projects.find(p => p.id === id);
    },

    upvoteProject: (projectId) => {
      set((state) => {
        const nextProjects = state.projects.map((proj) => {
          if (proj.id === projectId) {
            return {
              ...proj,
              upvotes: (proj.upvotes || 0) + 1
            };
          }
          return proj;
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_projects', JSON.stringify(nextProjects));
        }
        return { projects: nextProjects };
      });
    },

    addComment: (projectId, content, author) => {
      set((state) => {
        const nextProjects = state.projects.map((proj) => {
          if (proj.id === projectId) {
            const newComment = {
              id: `c-${Date.now()}`,
              author,
              content,
              timestamp: new Date().toISOString()
            };
            const nextComments = proj.comments ? [...proj.comments, newComment] : [newComment];
            return {
              ...proj,
              comments: nextComments,
              commentsCount: nextComments.length
            };
          }
          return proj;
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_projects', JSON.stringify(nextProjects));
        }
        return { projects: nextProjects };
      });
    },

    buyToken: (tokenId, amountTON, address) => {
      let isSuccess = false;
      set((state) => {
        const nextTokens = state.tokens.map((tok) => {
          if (tok.id === tokenId) {
            const originalPrice = tok.price;
            const newPrice = Number((tok.price * (1 + (amountTON / tok.marketCap) * 0.4)).toFixed(4));
            const newMCap = Number((tok.marketCap + amountTON).toFixed(2));
            const newVol = Number((tok.volume24h + amountTON).toFixed(2));
            const priceChange = Number((((newPrice - originalPrice) / originalPrice) * 100).toFixed(2));

            const updatedChart = [
              ...tok.chartData,
              {
                time: `05-${new Date().getDate()}`,
                price: newPrice,
                volume: Math.floor(amountTON)
              }
            ].slice(-30);

            isSuccess = true;
            return {
              ...tok,
              price: newPrice,
              priceChange24h: Number((tok.priceChange24h + priceChange).toFixed(2)),
              marketCap: newMCap,
              volume24h: newVol,
              chartData: updatedChart
            };
          }
          return tok;
        });

        if (isSuccess && typeof window !== 'undefined') {
          localStorage.setItem('vc_tokens', JSON.stringify(nextTokens));
        }
        return { tokens: nextTokens };
      });
      return isSuccess;
    },

    sellToken: (tokenId, tokenAmount, address) => {
      let isSuccess = false;
      set((state) => {
        const nextTokens = state.tokens.map((tok) => {
          if (tok.id === tokenId) {
            const refundTON = tokenAmount * tok.price;
            const originalPrice = tok.price;
            const newPrice = Math.max(0.0001, Number((tok.price * (1 - (refundTON / tok.marketCap) * 0.4)).toFixed(4)));
            const newMCap = Math.max(100, Number((tok.marketCap - refundTON).toFixed(2)));
            const newVol = Number((tok.volume24h + refundTON).toFixed(2));
            const priceChange = Number((((newPrice - originalPrice) / originalPrice) * 100).toFixed(2));

            const updatedChart = [
              ...tok.chartData,
              {
                time: `05-${new Date().getDate()}`,
                price: newPrice,
                volume: Math.floor(refundTON)
              }
            ].slice(-30);

            isSuccess = true;
            return {
              ...tok,
              price: newPrice,
              priceChange24h: Number((tok.priceChange24h + priceChange).toFixed(2)),
              marketCap: newMCap,
              volume24h: newVol,
              chartData: updatedChart
            };
          }
          return tok;
        });

        if (isSuccess && typeof window !== 'undefined') {
          localStorage.setItem('vc_tokens', JSON.stringify(nextTokens));
        }
        return { tokens: nextTokens };
      });
      return isSuccess;
    },

    advanceProjectMilestone: (projectId, index, targetStatus) => {
      set((state) => {
        const nextProjects = state.projects.map((proj) => {
          if (proj.id === projectId && proj.milestones) {
            const nextMilestones = proj.milestones.map((m, mI) => {
              if (mI === index) {
                return { ...m, status: targetStatus };
              }
              return m;
            });
            const allCompleted = nextMilestones.every(m => m.status === 'completed');
            return {
              ...proj,
              milestones: nextMilestones,
              status: allCompleted ? 'success' as const : proj.status
            };
          }
          return proj;
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_projects', JSON.stringify(nextProjects));
        }
        return { projects: nextProjects };
      });
    },

    listProjectOnAMM: (projectId) => {
      let isSuccess = false;
      set((state) => {
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return {};

        const nextProjects = state.projects.map((proj) => {
          if (proj.id === projectId) {
            return {
              ...proj,
              status: 'listed' as const
            };
          }
          return proj;
        });

        const tokenExists = state.tokens.some(t => t.symbol.toLowerCase() === project.agentTicker.toLowerCase());
        let nextTokens = state.tokens;
        if (!tokenExists) {
          const newToken: TokenInfo = {
            id: `tok-${project.agentTicker.toLowerCase()}`,
            name: `${project.agentName} Token`,
            symbol: project.agentTicker,
            price: project.tokenPrice || 0.01,
            priceChange24h: 4.8,
            marketCap: (project.goalAmount * 1.5) || 50000,
            volume24h: 3400,
            totalSupply: project.totalSupply || 10000000,
            circulatingSupply: project.raisedAmount / (project.tokenPrice || 0.01),
            holderCount: project.investorCount || 6,
            chartData: generateChartData(project.tokenPrice || 0.01)
          };
          nextTokens = [...state.tokens, newToken];
          if (typeof window !== 'undefined') {
            localStorage.setItem('vc_tokens', JSON.stringify(nextTokens));
          }
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_projects', JSON.stringify(nextProjects));
        }

        isSuccess = true;
        return { projects: nextProjects, tokens: nextTokens };
      });
      return isSuccess;
    },

    createTeamSpark: (projectId, creatorAddress, creatorName, targetAmount, initialContribution) => {
      const id = `team-${Date.now()}`;
      const newTeam: TeamSpark = {
        id,
        projectId,
        creatorAddress,
        creatorName,
        targetAmount,
        currentAmount: initialContribution,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // 24 hours duration
        status: initialContribution >= targetAmount ? 'success' : 'active',
        members: [
          { address: creatorAddress, amount: initialContribution, timestamp: new Date().toISOString() }
        ]
      };

      set((state) => {
        const nextTeams = [newTeam, ...state.teams];
        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_teams', JSON.stringify(nextTeams));
        }
        return { teams: nextTeams };
      });

      // If full on creation
      if (initialContribution >= targetAmount) {
        get().investInProject(projectId, initialContribution, creatorAddress);
      }

      return newTeam;
    },

    joinTeamSpark: (teamId, address, amount) => {
      let isSuccess = false;
      set((state) => {
        const nextTeams = state.teams.map((team) => {
          if (team.id === teamId && team.status === 'active') {
            const newAmount = team.currentAmount + amount;
            const isFull = newAmount >= team.targetAmount;

            // Check if member already exists
            const existingMemberIdx = team.members.findIndex(m => m.address === address);
            let nextMembers = [...team.members];
            if (existingMemberIdx !== -1) {
              nextMembers[existingMemberIdx] = {
                ...nextMembers[existingMemberIdx],
                amount: nextMembers[existingMemberIdx].amount + amount,
                timestamp: new Date().toISOString()
              };
            } else {
              nextMembers.push({ address, amount, timestamp: new Date().toISOString() });
            }

            isSuccess = true;
            const updatedTeam: TeamSpark = {
              ...team,
              currentAmount: newAmount,
              status: isFull ? 'success' as const : 'active' as const,
              members: nextMembers
            };

            // If team becomes fully funded, settle all member funds into the project
            if (isFull) {
              // Defer investment to avoid nested store calls during state compute
              setTimeout(() => {
                const store = useSparkStore.getState();
                updatedTeam.members.forEach((member) => {
                  store.investInProject(updatedTeam.projectId, member.amount, member.address);
                });

                // Add a notification to notificationStore
                try {
                  const project = store.getProjectById(updatedTeam.projectId);
                  if (project) {
                    useNotificationStore.getState().markAsRead(project.agentTicker);
                  }
                } catch (err) {}
              }, 100);
            }

            return updatedTeam;
          }
          return team;
        });

        if (isSuccess && typeof window !== 'undefined') {
          localStorage.setItem('vc_teams', JSON.stringify(nextTeams));
        }
        return { teams: nextTeams };
      });
      return isSuccess;
    },

    getTeamById: (teamId) => {
      return get().teams.find(t => t.id === teamId);
    },

    updateProjectDetails: (projectId, updates) => {
      set((state) => {
        const nextProjects = state.projects.map((p) => p.id === projectId ? { ...p, ...updates } : p);
        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_projects', JSON.stringify(nextProjects));
        }
        return { projects: nextProjects };
      });

      const token = getWalletJwt();
      if (token) {
        fetch(`${API_BASE}/api/v1/launches/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(updates),
          signal: AbortSignal.timeout(5000),
        }).catch((err) => {
          console.error('[SparkStore] Sync update launch details failed:', err);
        });
      }
    },

    createEcosystem: async (name, description, creatorWallet) => {
      const id = `eco-${Date.now()}`;
      const code = generateEcosystemCode();
      const ecosystem: CreatorEcosystem = {
        id,
        ecosystemCode: code,
        creatorWallet,
        name,
        description,
        status: 'active',
        createdAt: new Date().toISOString(),
        memberCount: 1
      };

      const token = getWalletJwt();
      if (token) {
        try {
          const res = await fetch(`${API_BASE}/api/v1/ecosystems`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, description }),
            signal: AbortSignal.timeout(5000)
          });
          const data = await res.json();
          if (data.success && data.data) {
            ecosystem.id = data.data.id;
            ecosystem.ecosystemCode = data.data.ecosystemCode;
          }
        } catch (e) {
          console.error('Failed to create ecosystem via API, using fallback:', e);
        }
      }

      set((state) => {
        const next = [ecosystem, ...state.ecosystems];
        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_ecosystems', JSON.stringify(next));
        }
        return { ecosystems: next };
      });
      return ecosystem;
    },

    getEcosystemsByCreator: (creatorWallet) => {
      return get().ecosystems.filter(e => e.creatorWallet.toLowerCase() === creatorWallet.toLowerCase());
    },

    createSquad: async (projectId, creatorWallet, creatorName, targetMembers, targetAmount) => {
      const id = `squad-${Date.now()}`;
      const code = generateSquadCode();
      const squad: SparkSquad = {
        id,
        squadCode: code,
        projectId,
        creatorWallet,
        creatorName,
        targetMembers,
        targetAmount,
        currentAmount: 0,
        currentMembers: 0,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        rewardText: '集火达标全队白名单权益',
        status: 'active',
        createdAt: new Date().toISOString()
      };

      const token = getWalletJwt();
      if (token) {
        try {
          const res = await fetch(`${API_BASE}/api/v1/squads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              projectId,
              creatorName,
              targetMembers,
              targetAmount: targetAmount
            }),
            signal: AbortSignal.timeout(5000)
          });
          const data = await res.json();
          if (data.success && data.data) {
            squad.id = data.data.id;
            squad.squadCode = data.data.squadCode;
            squad.expiresAt = data.data.expiresAt;
          }
        } catch (e) {
          console.error('Failed to create squad via worker API, using fallback:', e);
        }
      }

      set((state) => {
        const next = [squad, ...state.squads];
        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_squads', JSON.stringify(next));
        }
        return { squads: next };
      });
      return squad;
    },

    joinSquad: async (squadId, walletAddress, amount) => {
      let isSuccess = false;
      const token = getWalletJwt();

      if (token) {
        try {
          const res = await fetch(`${API_BASE}/api/v1/squads/${squadId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ amount }),
            signal: AbortSignal.timeout(5000)
          });
          const data = await res.json();
          if (data.success) {
            isSuccess = true;
          } else {
            console.error('Squad join rejected by API:', data.error);
            return false;
          }
        } catch (e) {
          console.error('Failed to join squad via API, using fallback:', e);
          isSuccess = true;
        }
      } else {
        isSuccess = true;
      }

      if (isSuccess) {
        set((state) => {
          const nextSquads = state.squads.map(s => {
            if (s.id === squadId && s.status === 'active') {
              const newAmount = s.currentAmount + amount;
              const newMembers = s.currentMembers + 1;
              const isFull = newAmount >= s.targetAmount && newMembers >= s.targetMembers;

              // Defer investment to avoid nested store calls during state compute
              setTimeout(() => {
                const store = useSparkStore.getState();
                store.investInProject(s.projectId, amount, walletAddress);
              }, 100);

              return {
                ...s,
                currentAmount: newAmount,
                currentMembers: newMembers,
                status: isFull ? 'success' as const : 'active' as const
              };
            }
            return s;
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('vc_squads', JSON.stringify(nextSquads));
          }
          return { squads: nextSquads };
        });
      }
      return isSuccess;
    },

    loadSquads: async (projectId) => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/squads/project/${projectId}`);
        const data = await res.json();
        if (data.success && data.data) {
          const fetchedSquads = data.data.map((r: any) => ({
            id: r.id,
            squadCode: r.squad_code,
            projectId: r.project_id,
            creatorWallet: r.creator_wallet,
            creatorName: r.creator_name,
            targetMembers: r.target_members,
            targetAmount: Number(r.target_amount_nano) / 1e9,
            currentAmount: Number(r.current_amount_nano) / 1e9,
            currentMembers: r.current_members,
            expiresAt: r.expires_at,
            rewardText: r.reward_text,
            status: r.status,
            createdAt: r.created_at,
          }));
          set((state) => {
            const otherSquads = state.squads.filter(s => s.projectId !== projectId);
            const nextSquads = [...fetchedSquads, ...otherSquads];
            if (typeof window !== 'undefined') {
              localStorage.setItem('vc_squads', JSON.stringify(nextSquads));
            }
            return { squads: nextSquads };
          });
        }
      } catch (err) {
        console.error('Failed to load squads:', err);
      }
    },

    addReferral: async (inviterWallet, inviteeWallet) => {
      let isSuccess = false;
      const token = getWalletJwt();
      if (token) {
        try {
          const res = await fetch(`${API_BASE}/api/v1/referrals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ inviterWallet }),
            signal: AbortSignal.timeout(5000)
          });
          const data = await res.json();
          if (data.success) {
            isSuccess = true;
          }
        } catch (e) {
          console.error('Failed to record referral via API, using fallback:', e);
          isSuccess = true;
        }
      } else {
        isSuccess = true;
      }

      if (isSuccess) {
        const newRef: ReferralRecord = {
          id: `ref-${Date.now()}`,
          inviterWallet,
          inviteeWallet,
          inviteeConnectedAt: new Date().toISOString(),
          rewardStatus: 'pending',
          rewardVcAmount: 50,
          createdAt: new Date().toISOString()
        };
        set((state) => {
          const next = [newRef, ...state.referrals];
          if (typeof window !== 'undefined') {
            localStorage.setItem('vc_referrals', JSON.stringify(next));
          }
          return { referrals: next };
        });
      }
      return isSuccess;
    },

    loadReferrals: async (wallet) => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/referrals/${wallet}`);
        const data = await res.json();
        if (data.success && data.data) {
          const fetchedRefs = data.data.map((r: any) => ({
            id: r.id,
            inviterWallet: r.inviter_wallet,
            inviteeWallet: r.invitee_wallet,
            inviteeConnectedAt: r.created_at,
            firstSparkProjectId: r.first_spark_project_id || undefined,
            firstSparkAmount: r.first_spark_amount_nano ? Number(r.first_spark_amount_nano) / 1e9 : undefined,
            firstSparkAt: r.first_spark_at || undefined,
            rewardStatus: r.reward_status,
            rewardVcAmount: Number(r.reward_vc_nano) / 1e9,
            flaggedReason: r.flagged_reason || undefined,
            createdAt: r.created_at,
          }));
          set((state) => {
            const others = state.referrals.filter(ref => ref.inviterWallet.toLowerCase() !== wallet.toLowerCase());
            const next = [...fetchedRefs, ...others];
            if (typeof window !== 'undefined') {
              localStorage.setItem('vc_referrals', JSON.stringify(next));
            }
            return { referrals: next };
          });
        }
      } catch (err) {
        console.error('Failed to load referrals:', err);
      }
    }
  };
});

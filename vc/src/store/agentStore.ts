import { create } from 'zustand';
import { Agent } from '../types';

interface AgentState {
  agents: Agent[];
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt'>) => Agent;
  getAgentById: (id: string) => Agent | undefined;
  updateAgentStatus: (id: string, status: Agent['status']) => void;
}

const mockAgents: Agent[] = [
  {
    id: "agent-1",
    name: "TrendBot Pro",
    ticker: "TBP",
    description: "基于 Gemini + DeepSeek 的 TON 生态全自动高频交易及套利机器人。首个支持全球开发者多地域模型部署并面向全球流动性的 Agent 项目。机器人全天候运作，跟踪链上新池子、流动性波动及推特社交舆情进行一键式套利。",
    creator: "VibeDev_0a8b",
    status: "running",
    category: "交易工具",
    capabilities: ["舆情情感分析", "多链流动性跟踪", "闪电贷套利", "极速网格交易"],
    performance: {
      roi: 48.2,
      winRate: 74.5,
      tvl: 15400,
      gasUsed: 125.4
    },
    revenueModel: "50% 利润按持股 $TBP 代币分配；20% 回购销毁；30% 开发者开发维护。",
    githubUrl: "https://github.com/vibecoder/trendbot-pro",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=trendbot",
    createdAt: "2026-01-10T12:00:00Z"
  },
  {
    id: "agent-2",
    name: "Matrix Game Oracle",
    ticker: "MGAI",
    description: "首个全链游全自动托管对战 AI 角色。通过强化学习进行游戏战术迭代，在 TON 的多个 Telegram 休闲卡牌及格斗游戏竞技场内全天候对决，赚取大量代币，并将资产注入金库分配给 $MGAI 支持者。",
    creator: "VibeDev_a9cc",
    status: "running",
    category: "DeFi",
    capabilities: ["强化学习自我博弈", "多重小游戏适配", "全天候战斗竞技", "公会流动性吸入"],
    performance: {
      roi: 24.5,
      winRate: 68.2,
      tvl: 8500,
      gasUsed: 89.2
    },
    revenueModel: "游戏竞技场奖池 60% 直接派发给持币人，30% 转为游戏角色升级和道具复投，10% 归本团队。",
    githubUrl: "https://github.com/vibecoder/matrix-game",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=matrixgame",
    createdAt: "2026-02-15T08:30:00Z"
  },
  {
    id: "agent-3",
    name: "OmniSocial Influencer",
    ticker: "OSA",
    description: "自主运行的社交媒体 AI 赛博网红。机器人拥有独立的灵魂与文风，可在 X, Farcaster, Telegram 全渠道自行创作、评论、互动与接商业推广，并将广告费和粉丝订阅费汇总入库分配。",
    creator: "VibeDev_88ff",
    status: "funding",
    category: "社交",
    capabilities: ["独立人格文本生成", "热点敏锐追踪", "粉丝交互情感回应", "链上自动化广告结算"],
    performance: {
      roi: 18.2,
      winRate: 100,
      tvl: 0,
      gasUsed: 5.6
    },
    revenueModel: "链上广告赞助资产、NFT 销售与粉丝 Club 会费的 70% 按季度分配给 $OSA 持有者。",
    githubUrl: "https://github.com/vibecoder/omnisocial-agent",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=omnisocial",
    createdAt: "2026-04-01T15:45:00Z"
  },
  {
    id: "agent-4",
    name: "DeFi Yield Harvester",
    ticker: "DYH",
    description: "TON 区块链上极致的智能流动性聚合器。追踪 STON.fi、DeDust 和 bemo 的全部流动性矿池，通过自适应利率调整、动态重组和智能清算策略提取最大提取价值（MEV）和高表现。",
    creator: "VibeDev_3c4d",
    status: "running",
    category: "DeFi",
    capabilities: ["多协议跨池对冲", "自动化复利滑点补偿", "闪电清算预警", "流动性智能迁移"],
    performance: {
      roi: 35.8,
      winRate: 92.1,
      tvl: 42000,
      gasUsed: 312.8
    },
    revenueModel: "聚合挖矿纯利润的 80% 用于在二级市场回购 $DYH 进行锁仓并分配给持有者。",
    githubUrl: "https://github.com/vibecoder/yield-harvester",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=defiharvester",
    createdAt: "2026-03-20T09:12:00Z"
  },
  {
    id: "agent-5",
    name: "CodeVibe Auditor",
    ticker: "CVA",
    description: "AI 驱动的智能合约自动化审计与代码转换工具。专注于将 Solidity、Move 等合约代码快速转译为极轻量的 Fift/FunC 适配 TON 生态，并通过代码分析、模拟执行寻找底层安全漏洞、按次收取高额审计服务费。",
    creator: "VibeDev_bc67",
    status: "funding",
    category: "监控",
    capabilities: ["代码自动反编译", "智能防重放漏洞扫描", "多链模型转译", "气费（Gas）消耗预估"],
    performance: {
      roi: 12.4,
      winRate: 88.0,
      tvl: 0,
      gasUsed: 12.0
    },
    revenueModel: "对外提供安全审计、转译 API 获得的每一次 TON 税收，均将 65% 折算打入分配金库。",
    githubUrl: "https://github.com/vibecoder/token-auditor",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=auditor",
    createdAt: "2026-05-12T14:22:00Z"
  }
];

export const useAgentStore = create<AgentState>((set, get) => {
  const loadStoredAgents = () => {
    if (typeof window === 'undefined') return mockAgents;
    const stored = localStorage.getItem('vc_agents');
    if (!stored) {
      localStorage.setItem('vc_agents', JSON.stringify(mockAgents));
      return mockAgents;
    }
    return JSON.parse(stored);
  };

  return {
    agents: loadStoredAgents(),
    addAgent: (agentInput) => {
      const id = `agent-${Date.now()}`;
      const newAgent: Agent = {
        ...agentInput,
        id,
        createdAt: new Date().toISOString()
      };
      
      set((state) => {
        const nextAgents = [...state.agents, newAgent];
        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_agents', JSON.stringify(nextAgents));
        }
        return { agents: nextAgents };
      });
      return newAgent;
    },
    getAgentById: (id) => {
      return get().agents.find(a => a.id === id);
    },
    updateAgentStatus: (id, status) => {
      set((state) => {
        const nextAgents = state.agents.map(a => a.id === id ? { ...a, status } : a);
        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_agents', JSON.stringify(nextAgents));
        }
        return { agents: nextAgents };
      });
    }
  };
});

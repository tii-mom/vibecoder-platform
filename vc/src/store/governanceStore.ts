import { create } from 'zustand';
import { GovernanceProposal, GovernanceVote, ExitRequest } from '../types';
import { getWalletJwt } from '../services/telegramAuth';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

interface GovernanceState {
  proposals: Record<string, GovernanceProposal[]>; // projectId -> proposals
  votes: Record<string, GovernanceVote[]>; // proposalId -> votes
  exitRequests: Record<string, ExitRequest[]>; // projectId -> exitRequests
  voteOnProposal: (proposalId: string, projectId: string, userAddress: string, vote: 'yes' | 'no', weight: number) => Promise<void>;
  createProposal: (projectId: string, amount: number, purpose: string, type?: 'ton_withdrawal' | 'ops_token') => Promise<void>;
  createExitRequest: (projectId: string, userAddress: string, redeemedTON: number, burnedTokens: number) => Promise<void>;
  loadProposals: (projectId: string) => Promise<void>;
  loadExitRequests: (projectId: string) => Promise<void>;
}

export const useGovernanceStore = create<GovernanceState>((set, get) => {
  // Load initial proposals from localStorage if available, or fall back to mock
  const isBrowser = typeof window !== 'undefined';
  const loadStored = (key: string, fallback: any) => {
    if (!isBrowser) return fallback;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  };

  const initialProposals: Record<string, GovernanceProposal[]> = loadStored('vc_gov_proposals', {
    'spark-1': [
      {
        id: 'prop-1',
        projectId: 'spark-1',
        amount: 500,
        purpose: '服务器扩容 + API 性能优化，用于支持本月激增的社交裂变用户',
        yesWeight: 35,
        noWeight: 10,
        status: 'active',
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 24 hours ago
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // 24 hours from now
        votedAddresses: ['EQC...someAddress'],
        votesCount: { yes: 12, no: 3 },
        type: 'ton_withdrawal',
      },
      {
        id: 'prop-2',
        projectId: 'spark-1',
        amount: 300,
        purpose: '前端 UI 重构与移动端适配升级，提升 Web 交互的 Aha Moment 体验',
        yesWeight: 120,
        noWeight: 15,
        status: 'passed',
        createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
        votedAddresses: [],
        votesCount: { yes: 28, no: 4 },
        type: 'ton_withdrawal',
      },
      {
        id: 'prop-3',
        projectId: 'spark-1',
        amount: 800,
        purpose: '赞助线下加密社区极客大会与海外 KOL 市场宣发推广',
        yesWeight: 20,
        noWeight: 85,
        status: 'rejected',
        createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 13 * 24 * 3600 * 1000).toISOString(),
        votedAddresses: [],
        votesCount: { yes: 5, no: 19 },
        type: 'ton_withdrawal',
      },
      {
        id: 'prop-ops-1',
        projectId: 'spark-1',
        amount: 1.2,
        purpose: 'X 平台营销推广及大 V 联合宣发预算支出',
        yesWeight: 45,
        noWeight: 8,
        status: 'passed',
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        votedAddresses: [],
        votesCount: { yes: 45, no: 8 },
        type: 'ops_token',
      },
      {
        id: 'prop-ops-2',
        projectId: 'spark-1',
        amount: 0.8,
        purpose: '社区内测 AMA 问答活动持有人代币空投发放',
        yesWeight: 52,
        noWeight: 3,
        status: 'passed',
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        votedAddresses: [],
        votesCount: { yes: 52, no: 3 },
        type: 'ops_token',
      },
      {
        id: 'prop-ops-3',
        projectId: 'spark-1',
        amount: 2.5,
        purpose: '智能合约静态代码服务三方漏洞扫描安全审计费用申请',
        yesWeight: 18,
        noWeight: 12,
        status: 'active',
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
        votedAddresses: [],
        votesCount: { yes: 18, no: 12 },
        type: 'ops_token',
      }
    ],
    'spark-2': [
      {
        id: 'prop-4',
        projectId: 'spark-2',
        amount: 600,
        purpose: '扩展 TON 智能合约静态审计规则库，覆盖最新 Tolk 编译器特性',
        yesWeight: 45,
        noWeight: 5,
        status: 'active',
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
        votedAddresses: [],
        votesCount: { yes: 7, no: 1 },
        type: 'ton_withdrawal',
      }
    ]
  });

  const initialVotes: Record<string, GovernanceVote[]> = loadStored('vc_gov_votes', {});
  const initialExitRequests: Record<string, ExitRequest[]> = loadStored('vc_gov_exit_requests', {});

  const saveToStorage = (key: string, data: any) => {
    if (isBrowser) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  return {
    proposals: initialProposals,
    votes: initialVotes,
    exitRequests: initialExitRequests,

    loadProposals: async (projectId) => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/launches/${projectId}/proposals`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          set((state) => ({
            proposals: {
              ...state.proposals,
              [projectId]: data.data,
            },
          }));
          return;
        }
      } catch (err) {
        console.error('Failed to load proposals from worker API:', err);
      }
    },

    loadExitRequests: async (projectId) => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/launches/${projectId}/exit-requests`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          set((state) => ({
            exitRequests: {
              ...state.exitRequests,
              [projectId]: data.data,
            },
          }));
          return;
        }
      } catch (err) {
        console.error('Failed to load exit requests from worker API:', err);
      }
    },

    voteOnProposal: async (proposalId, projectId, userAddress, vote, weight) => {
      try {
        const token = getWalletJwt();
        const res = await fetch(`${API_BASE}/api/v1/launches/${projectId}/proposals/${proposalId}/vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ userAddress, vote, weight }),
          signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        if (data.success) {
          await get().loadProposals(projectId);
          return;
        }
      } catch (err) {
        console.error('Failed to vote via worker API, falling back to local mock:', err);
      }

      set((state) => {
        const projectProps = state.proposals[projectId] || [];
        const updatedProps = projectProps.map((p) => {
          if (p.id === proposalId) {
            const votedAddrs = p.votedAddresses || [];
            if (votedAddrs.includes(userAddress)) return p; // prevent double voting

            const yesInc = vote === 'yes' ? weight : 0;
            const noInc = vote === 'no' ? weight : 0;

            const votesCount = p.votesCount || { yes: 0, no: 0 };

            return {
              ...p,
              yesWeight: p.yesWeight + yesInc,
              noWeight: p.noWeight + noInc,
              votedAddresses: [...votedAddrs, userAddress],
              votesCount: {
                yes: votesCount.yes + (vote === 'yes' ? 1 : 0),
                no: votesCount.no + (vote === 'no' ? 1 : 0),
              }
            };
          }
          return p;
        });

        const newProposals = {
          ...state.proposals,
          [projectId]: updatedProps,
        };

        const newVote: GovernanceVote = {
          id: `vote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          proposalId,
          userAddress,
          weight,
          vote,
          createdAt: new Date().toISOString(),
        };

        const newVotes = {
          ...state.votes,
          [proposalId]: [...(state.votes[proposalId] || []), newVote],
        };

        saveToStorage('vc_gov_proposals', newProposals);
        saveToStorage('vc_gov_votes', newVotes);

        return {
          proposals: newProposals,
          votes: newVotes,
        };
      });
    },

    createProposal: async (projectId, amount, purpose, type = 'ton_withdrawal') => {
      try {
        const token = getWalletJwt();
        const res = await fetch(`${API_BASE}/api/v1/launches/${projectId}/proposals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ amount, purpose, type }),
          signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        if (data.success) {
          await get().loadProposals(projectId);
          return;
        }
      } catch (err) {
        console.error('Failed to create proposal via worker API, falling back to local mock:', err);
      }

      set((state) => {
        const newProp: GovernanceProposal = {
          id: `prop-${Date.now()}`,
          projectId,
          amount,
          purpose,
          yesWeight: 0,
          noWeight: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          votedAddresses: [],
          votesCount: { yes: 0, no: 0 },
          type,
        };

        const newProposals = {
          ...state.proposals,
          [projectId]: [newProp, ...(state.proposals[projectId] || [])],
        };

        saveToStorage('vc_gov_proposals', newProposals);
        return { proposals: newProposals };
      });
    },

    createExitRequest: async (projectId, userAddress, redeemedTON, burnedTokens) => {
      try {
        const token = getWalletJwt();
        const res = await fetch(`${API_BASE}/api/v1/launches/${projectId}/exit-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ userAddress, redeemedTON, burnedTokens }),
          signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        if (data.success) {
          await get().loadExitRequests(projectId);
          return;
        }
      } catch (err) {
        console.error('Failed to create exit request via worker API, falling back to local mock:', err);
      }

      set((state) => {
        const newRequest: ExitRequest = {
          id: `exit-${Date.now()}`,
          projectId,
          userAddress,
          redeemedTON,
          burnedTokens,
          createdAt: new Date().toISOString(),
        };

        const newExitRequests = {
          ...state.exitRequests,
          [projectId]: [...(state.exitRequests[projectId] || []), newRequest],
        };

        saveToStorage('vc_gov_exit_requests', newExitRequests);
        return { exitRequests: newExitRequests };
      });
    },
  };
});

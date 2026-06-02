import { create } from 'zustand';
import { GovernanceProposal, GovernanceVote, ExitRequest } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

interface GovernanceState {
  proposals: Record<string, GovernanceProposal[]>; // projectId -> proposals
  votes: Record<string, GovernanceVote[]>; // proposalId -> votes
  exitRequests: Record<string, ExitRequest[]>; // projectId -> exitRequests
  loadingProjects: Record<string, boolean>;
  loadProjectGovernance: (projectId: string) => Promise<void>;
  voteOnProposal: (proposalId: string, projectId: string, userAddress: string, vote: 'yes' | 'no', weight: number) => void;
  createProposal: (projectId: string, amount: number, purpose: string, requesterWallet?: string) => void;
  createExitRequest: (projectId: string, userAddress: string, redeemedTON: number, burnedTokens: number) => void;
}

const initialProposals: Record<string, GovernanceProposal[]> = {
  'spark-1': [
    {
      id: 'prop-1',
      projectId: 'spark-1',
      amount: 500,
      purpose: '服务器扩容 + API 性能优化，用于支持本月激增的社交裂变用户',
      yesWeight: 35,
      noWeight: 10,
      status: 'active',
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      votedAddresses: ['EQC...someAddress'],
      votesCount: { yes: 12, no: 3 },
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
    }
  ]
};

const groupVotesByProposal = (votes: GovernanceVote[]) => votes.reduce<Record<string, GovernanceVote[]>>((acc, vote) => {
  acc[vote.proposalId] = [...(acc[vote.proposalId] || []), vote];
  return acc;
}, {});

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T | null> => {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      signal: AbortSignal.timeout(5000),
    });
    const payload = await res.json() as { success?: boolean; data?: T };
    if (!res.ok || !payload.success) return null;
    return payload.data ?? null;
  } catch {
    return null;
  }
};

export const useGovernanceStore = create<GovernanceState>((set) => ({
  proposals: initialProposals,
  votes: {},
  exitRequests: {},
  loadingProjects: {},

  loadProjectGovernance: async (projectId) => {
    set((state) => ({ loadingProjects: { ...state.loadingProjects, [projectId]: true } }));
    const data = await requestJson<{
      proposals?: GovernanceProposal[];
      votes?: GovernanceVote[];
      exitRequests?: ExitRequest[];
    }>(`/api/v1/launches/${projectId}/governance/stats`);

    if (data) {
      set((state) => ({
        proposals: { ...state.proposals, [projectId]: data.proposals || [] },
        votes: { ...state.votes, ...groupVotesByProposal(data.votes || []) },
        exitRequests: { ...state.exitRequests, [projectId]: data.exitRequests || [] },
        loadingProjects: { ...state.loadingProjects, [projectId]: false },
      }));
      return;
    }

    set((state) => ({ loadingProjects: { ...state.loadingProjects, [projectId]: false } }));
  },

  voteOnProposal: (proposalId, projectId, userAddress, vote, weight) => {
    const applyVote = (serverProposal?: GovernanceProposal, serverVote?: GovernanceVote) => {
      set((state) => {
        const projectProps = state.proposals[projectId] || [];
        const updatedProps = projectProps.map((p) => {
          if (p.id !== proposalId) return p;
          if (serverProposal) return serverProposal;

          const votedAddrs = p.votedAddresses || [];
          if (votedAddrs.includes(userAddress)) return p;
          const votesCount = p.votesCount || { yes: 0, no: 0 };
          return {
            ...p,
            yesWeight: p.yesWeight + (vote === 'yes' ? weight : 0),
            noWeight: p.noWeight + (vote === 'no' ? weight : 0),
            votedAddresses: [...votedAddrs, userAddress],
            votesCount: {
              yes: votesCount.yes + (vote === 'yes' ? 1 : 0),
              no: votesCount.no + (vote === 'no' ? 1 : 0),
            }
          };
        });

        const newVote = serverVote || {
          id: `vote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          proposalId,
          userAddress,
          weight,
          vote,
          createdAt: new Date().toISOString(),
        };

        return {
          proposals: { ...state.proposals, [projectId]: updatedProps },
          votes: { ...state.votes, [proposalId]: [...(state.votes[proposalId] || []), newVote] },
        };
      });
    };

    void requestJson<{ proposal: GovernanceProposal; vote: GovernanceVote }>(
      `/api/v1/launches/${projectId}/governance/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ proposal_id: proposalId, user_id: userAddress, vote, weight }),
      }
    ).then((data) => {
      if (data) applyVote(data.proposal, data.vote);
      else applyVote();
    });
  },

  createProposal: (projectId, amount, purpose, requesterWallet) => {
    const optimisticProposal: GovernanceProposal = {
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
    };

    set((state) => ({
      proposals: {
        ...state.proposals,
        [projectId]: [optimisticProposal, ...(state.proposals[projectId] || [])],
      },
    }));

    void requestJson<{ id: string; createdAt: string; expiresAt: string }>(
      `/api/v1/launches/${projectId}/operations`,
      {
        method: 'POST',
        body: JSON.stringify({ amount, purpose, requester_wallet: requesterWallet }),
      }
    ).then((data) => {
      if (!data) return;
      set((state) => ({
        proposals: {
          ...state.proposals,
          [projectId]: (state.proposals[projectId] || []).map((proposal) => (
            proposal.id === optimisticProposal.id
              ? { ...proposal, id: data.id, createdAt: data.createdAt, expiresAt: data.expiresAt }
              : proposal
          )),
        },
      }));
    });
  },

  createExitRequest: (projectId, userAddress, redeemedTON, burnedTokens) => {
    const newRequest: ExitRequest = {
      id: `exit-${Date.now()}`,
      projectId,
      userAddress,
      redeemedTON,
      burnedTokens,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      exitRequests: {
        ...state.exitRequests,
        [projectId]: [...(state.exitRequests[projectId] || []), newRequest],
      },
    }));
  },
}));

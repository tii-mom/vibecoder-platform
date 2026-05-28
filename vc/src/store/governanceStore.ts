import { create } from 'zustand';
import { GovernanceProposal, GovernanceVote, ExitRequest } from '../types';

interface GovernanceState {
  proposals: Record<string, GovernanceProposal[]>; // projectId -> proposals
  votes: Record<string, GovernanceVote[]>; // proposalId -> votes
  exitRequests: Record<string, ExitRequest[]>; // projectId -> exitRequests
  voteOnProposal: (proposalId: string, projectId: string, userAddress: string, vote: 'yes' | 'no', weight: number) => void;
  createProposal: (projectId: string, amount: number, purpose: string) => void;
  createExitRequest: (projectId: string, userAddress: string, redeemedTON: number, burnedTokens: number) => void;
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

    voteOnProposal: (proposalId, projectId, userAddress, vote, weight) => {
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

        // Create new vote record
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

    createProposal: (projectId, amount, purpose) => {
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
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(), // 48 hours validity
          votedAddresses: [],
          votesCount: { yes: 0, no: 0 },
        };

        const newProposals = {
          ...state.proposals,
          [projectId]: [newProp, ...(state.proposals[projectId] || [])],
        };

        saveToStorage('vc_gov_proposals', newProposals);
        return { proposals: newProposals };
      });
    },

    createExitRequest: (projectId, userAddress, redeemedTON, burnedTokens) => {
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

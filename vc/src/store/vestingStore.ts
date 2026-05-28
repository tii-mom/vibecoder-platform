import { create } from 'zustand';

export interface VestingRound {
  round: number;
  locked: number;          // % of total
  unlocked: boolean;
  priceThreshold: string;  // TON price
  currentPrice: string;
  matched: boolean;        // price reached threshold
  matchedAt: string | null;
}

export interface VestingState {
  rounds: Record<string, VestingRound[]>; // projectId -> rounds
  initialPrice: Record<string, number>;   // projectId -> avg price at launch
  loadRounds: (projectId: string, totalTokens: number, avgPrice: number) => void;
  unlockRound: (projectId: string, round: number) => void;
}

const generateRounds = (totalTokens: number, avgPrice: number): VestingRound[] => {
  const rounds: VestingRound[] = [];
  // 2% at TGE (round 0 unlocked immediately)
  const totalShare = 0.38; // 38% over 10 rounds
  const perRound = (totalShare / 10) * 100; // % per round
  for (let i = 1; i <= 10; i++) {
    rounds.push({
      round: i,
      locked: i === 1 ? 2 : perRound, // first round shows 2% TGE
      unlocked: i <= 1,
      priceThreshold: (avgPrice * Math.pow(1.5, i)).toFixed(4),
      currentPrice: (avgPrice * (i <= 2 ? 1 : Math.pow(1.3, i - 1))).toFixed(4),
      matched: i <= 1,
      matchedAt: i <= 1 ? new Date(Date.now() - 48 * 3600 * 1000).toISOString() : null,
    });
  }
  return rounds;
};

export const useVestingStore = create<VestingState>((set) => ({
  rounds: {},
  initialPrice: {},

  loadRounds: (projectId, totalTokens, avgPrice) => {
    set((state) => ({
      rounds: { ...state.rounds, [projectId]: generateRounds(totalTokens, avgPrice) },
      initialPrice: { ...state.initialPrice, [projectId]: avgPrice },
    }));
  },

  unlockRound: (projectId, round) => {
    set((state) => {
      const projectRounds = state.rounds[projectId] || [];
      return {
        rounds: {
          ...state.rounds,
          [projectId]: projectRounds.map((r) =>
            r.round === round ? { ...r, unlocked: true } : r
          ),
        },
      };
    });
  },
}));

import { create } from 'zustand';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

export interface VestingRound {
  round: number;
  locked: number;
  unlocked: boolean;
  priceThreshold: string;
  currentPrice: string;
  matched: boolean;
  matchedAt: string | null;
}

export interface VestingState {
  rounds: Record<string, VestingRound[]>;
  initialPrice: Record<string, number>;
  loadRounds: (projectId: string, totalTokens: number, avgPrice: number) => Promise<void>;
  unlockRound: (projectId: string, round: number) => void;
}

const generateRounds = (totalTokens: number, avgPrice: number): VestingRound[] => {
  const rounds: VestingRound[] = [];
  const totalShare = 0.38;
  const perRound = (totalShare / 10) * 100;
  for (let i = 1; i <= 10; i++) {
    rounds.push({
      round: i,
      locked: i === 1 ? 2 : perRound,
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

  loadRounds: async (projectId, totalTokens, avgPrice) => {
    // Try API first
    try {
      const res = await fetch(`${API_BASE}/api/v1/launches/${projectId}/vesting`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data.success && data.data?.length) {
        set((state) => ({
          rounds: { ...state.rounds, [projectId]: data.data },
          initialPrice: { ...state.initialPrice, [projectId]: avgPrice },
        }));
        return;
      }
    } catch {}
    // Fallback to mock
    set((state) => ({
      rounds: { ...state.rounds, [projectId]: generateRounds(totalTokens, avgPrice) },
      initialPrice: { ...state.initialPrice, [projectId]: avgPrice },
    }));
  },

  unlockRound: (projectId, round) => {
    set((state) => {
      const projectRounds = state.rounds[projectId] || [];
      return {
        rounds: { ...state.rounds, [projectId]: projectRounds.map((r) => r.round === round ? { ...r, unlocked: true } : r) },
      };
    });
  },
}));

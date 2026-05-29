import { create } from 'zustand';

interface ContractInfo {
  contract_name: string;
  address: string;
}

interface ContractState {
  contracts: ContractInfo[];
  loading: boolean;
  fetchContracts: () => Promise<void>;
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

export const useContractStore = create<ContractState>((set) => ({
  contracts: [],
  loading: false,
  fetchContracts: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_BASE}/api/v1/platform/contracts`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data.success) set({ contracts: data.data, loading: false });
      else set({ loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));

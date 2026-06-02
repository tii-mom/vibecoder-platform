import { create } from 'zustand';
import { useUserStore } from './userStore';

export interface FundPortfolioItem {
  id: string;
  name: string;
  ticker: string;
  investedVC: number;
  returnsTON: number;
  returnsToken: number;
  returnedTokenTicker: string;
  status: 'ongoing' | 'completed';
  roi: number;
}

export interface FundTransaction {
  id: string;
  type: 'system_allocation' | 'user_deposit' | 'user_withdraw' | 'investment_outflow' | 'revenue_inflow';
  amount: number;
  token: 'VC' | 'TON';
  from: string;
  to: string;
  date: string;
  txHash?: string;
}

interface FundState {
  totalFundVC: number;
  totalUserDepositedVC: number;
  userDepositedVC: number;
  tonReserves: number;
  portfolio: FundPortfolioItem[];
  transactions: FundTransaction[];
  depositVC: (amount: number) => Promise<boolean>;
  withdrawVC: (amount: number) => Promise<boolean>;
}

const mockPortfolio: FundPortfolioItem[] = [
  {
    id: "proj-1",
    name: "TrendBot Pro",
    ticker: "TBP",
    investedVC: 12000000,
    returnsTON: 45000,
    returnsToken: 15000000,
    returnedTokenTicker: "TBP",
    status: "completed",
    roi: 145.8
  },
  {
    id: "proj-2",
    name: "Matrix Game Oracle",
    ticker: "MGAI",
    investedVC: 8000000,
    returnsTON: 28000,
    returnsToken: 10000000,
    returnedTokenTicker: "MGAI",
    status: "completed",
    roi: 135.0
  },
  {
    id: "proj-3",
    name: "OmniSocial Influencer",
    ticker: "OSA",
    investedVC: 15000000,
    returnsTON: 12000,
    returnsToken: 0,
    returnedTokenTicker: "OSA",
    status: "ongoing",
    roi: 108.0
  },
  {
    id: "proj-4",
    name: "CodeVibe Auditor",
    ticker: "CVA",
    investedVC: 20000000,
    returnsTON: 8000,
    returnsToken: 0,
    returnedTokenTicker: "CVA",
    status: "ongoing",
    roi: 104.0
  }
];

const mockTransactions: FundTransaction[] = [
  {
    id: "tx-1",
    type: "system_allocation",
    amount: 720000000,
    token: "VC",
    from: "Mint (代币创世发行)",
    to: "Fund Contract (国库合约)",
    date: "2026-05-20 12:00:00",
    txHash: "EQA...310f"
  },
  {
    id: "tx-2",
    type: "user_deposit",
    amount: 250000,
    token: "VC",
    from: "EQB2...11p2 (Degen User)",
    to: "Fund Contract (国库合约)",
    date: "2026-05-28 15:32:10",
    txHash: "EQC...90a1"
  },
  {
    id: "tx-3",
    type: "investment_outflow",
    amount: 15000000,
    token: "VC",
    from: "Fund Contract (国库合约)",
    to: "OmniSocial ($OSA) LP Seed",
    date: "2026-05-29 09:15:00",
    txHash: "EQD...78ef"
  },
  {
    id: "tx-4",
    type: "revenue_inflow",
    amount: 45000,
    token: "TON",
    from: "TrendBot Pro (套利分红收益)",
    to: "Fund Contract (国库合约)",
    date: "2026-05-30 11:22:45",
    txHash: "EQA...998c"
  }
];

export const useFundStore = create<FundState>((set, get) => {
  // Load state from localStorage if available
  const loadStored = <T>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  };

  const persist = <T>(key: string, data: T) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  const initialTotalUserDeposits = loadStored('vc_fund_total_user_deposits', 3450000);
  const initialUserDeposit = loadStored('vc_fund_user_deposit', 0);
  const initialTonReserves = loadStored('vc_fund_ton_reserves', 125000);
  const initialPortfolio = loadStored('vc_fund_portfolio', mockPortfolio);
  const initialTransactions = loadStored('vc_fund_transactions', mockTransactions);

  return {
    totalFundVC: 720000000 + initialTotalUserDeposits,
    totalUserDepositedVC: initialTotalUserDeposits,
    userDepositedVC: initialUserDeposit,
    tonReserves: initialTonReserves,
    portfolio: initialPortfolio,
    transactions: initialTransactions,

    depositVC: async (amount: number): Promise<boolean> => {
      const userStore = useUserStore.getState();
      const profile = userStore.profile;
      if (!profile || !userStore.isConnected) return false;

      if (profile.balanceVC < amount) return false;

      // Deduct balance from userStore
      const newBalanceVC = Number((profile.balanceVC - amount).toFixed(2));
      userStore.updateProfile({
        balanceVC: newBalanceVC,
        hasGasConsumption: true
      });

      // Update tokens array in userStore
      const nextTokens = userStore.tokens.map(t => {
        if (t.symbol === 'VC') {
          return { ...t, balance: newBalanceVC };
        }
        return t;
      });
      useUserStore.setState({ tokens: nextTokens });

      // Update Fund State
      const nextUserDeposited = get().userDepositedVC + amount;
      const nextTotalUserDeposits = get().totalUserDepositedVC + amount;
      const nextTotalFund = 720000000 + nextTotalUserDeposits;

      const newTx: FundTransaction = {
        id: `tx-${Date.now()}`,
        type: 'user_deposit',
        amount,
        token: 'VC',
        from: profile.walletAddress || 'Me',
        to: "Fund Contract (国库合约)",
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        txHash: import.meta.env.DEV
          ? '0x' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('')
          : 'PENDING_ONCHAIN',
      };

      const nextTxs = [newTx, ...get().transactions];

      set({
        userDepositedVC: nextUserDeposited,
        totalUserDepositedVC: nextTotalUserDeposits,
        totalFundVC: nextTotalFund,
        transactions: nextTxs
      });

      persist('vc_fund_user_deposit', nextUserDeposited);
      persist('vc_fund_total_user_deposits', nextTotalUserDeposits);
      persist('vc_fund_transactions', nextTxs);

      return true;
    },

    withdrawVC: async (amount: number): Promise<boolean> => {
      const userStore = useUserStore.getState();
      const profile = userStore.profile;
      if (!profile || !userStore.isConnected) return false;

      if (get().userDepositedVC < amount) return false;

      // Add balance back to userStore
      const newBalanceVC = Number((profile.balanceVC + amount).toFixed(2));
      userStore.updateProfile({
        balanceVC: newBalanceVC,
        hasGasConsumption: true
      });

      // Update tokens array in userStore
      const nextTokens = userStore.tokens.map(t => {
        if (t.symbol === 'VC') {
          return { ...t, balance: newBalanceVC };
        }
        return t;
      });
      useUserStore.setState({ tokens: nextTokens });

      // Update Fund State
      const nextUserDeposited = Math.max(0, get().userDepositedVC - amount);
      const nextTotalUserDeposits = Math.max(0, get().totalUserDepositedVC - amount);
      const nextTotalFund = 720000000 + nextTotalUserDeposits;

      const newTx: FundTransaction = {
        id: `tx-${Date.now()}`,
        type: 'user_withdraw',
        amount,
        token: 'VC',
        from: "Fund Contract (国库合约)",
        to: profile.walletAddress || 'Me',
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        txHash: import.meta.env.DEV
          ? '0x' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('')
          : 'PENDING_ONCHAIN',
      };

      const nextTxs = [newTx, ...get().transactions];

      set({
        userDepositedVC: nextUserDeposited,
        totalUserDepositedVC: nextTotalUserDeposits,
        totalFundVC: nextTotalFund,
        transactions: nextTxs
      });

      persist('vc_fund_user_deposit', nextUserDeposited);
      persist('vc_fund_total_user_deposits', nextTotalUserDeposits);
      persist('vc_fund_transactions', nextTxs);

      return true;
    }
  };
});

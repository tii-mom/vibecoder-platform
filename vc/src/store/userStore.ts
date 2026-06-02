import { create } from 'zustand';
import { UserProfile } from '../types';
import { getTonapiBase } from '../services/tonNetwork';

export interface TokenInfo {
  masterAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  image?: string;
  balance: number;
}

interface UserState {
  walletAddress: string | null;
  isConnected: boolean;
  profile: UserProfile | null;
  tonConnectUI: any | null;
  tokens: TokenInfo[];
  connectWallet: (address?: string) => void;
  disconnectWallet: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  addFunds: (tonAmount: number, vcAmount?: number) => void;
  setTonConnectUI: (instance: any) => void;
  addToken: (masterAddress: string) => Promise<boolean>;
  updateTokenBalances: (tonBalance: number, jettonBalances: any[]) => void;
}

// Helper to normalize TON addresses for comparison
const normalizeAddress = (addr: string): string => {
  if (!addr) return '';
  return addr.toLowerCase().trim();
};

export const useUserStore = create<UserState>((set, get) => {
  const storedAddress = typeof window !== 'undefined' ? localStorage.getItem('vc_wallet_address') : null;
  const storedProfile = typeof window !== 'undefined' ? localStorage.getItem('vc_user_profile') : null;

  const initialAddress = storedAddress || null;
  const initialProfile: UserProfile | null = storedProfile
    ? JSON.parse(storedProfile)
    : null;

  // Initial default tokens
  const getDefaultTokens = (userAddr: string | null): TokenInfo[] => {
    const defaults: TokenInfo[] = [
      {
        masterAddress: 'native',
        symbol: 'TON',
        name: 'TON',
        decimals: 9,
        image: 'https://s2.coinmarketcap.com/static/img/coins/64x64/11419.png',
        balance: 0,
      },
      {
        masterAddress: 'EQCxE6mUtQJKFnGfaEMPZZhpV-E2c300J7QgO6MAwujob9qx', // Testnet USDT
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        image: 'https://tether.to/images/logoCircle.svg',
        balance: 0,
      },
      {
        masterAddress: 'UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf', // Current testnet VC Jetton address
        symbol: 'VC',
        name: 'VibeCoder',
        decimals: 9,
        image: 'https://ivory-keen-perch-796.mypinata.cloud/ipfs/bafybeiacwuijot2yzefy4gigliwlocqdvt5uzximjinsszpkbl72v2dhgq',
        balance: 0,
      }
    ];

    if (!userAddr) return defaults;

    // Load custom tokens from localStorage
    try {
      const storedCustom = localStorage.getItem(`vc_custom_tokens_${userAddr}`);
      if (storedCustom) {
        const parsed = JSON.parse(storedCustom) as TokenInfo[];
        return [...defaults, ...parsed];
      }
    } catch (e) {
      console.error('Failed to parse custom tokens:', e);
    }

    return defaults;
  };

  return {
    walletAddress: initialAddress,
    isConnected: !!initialAddress,
    profile: initialProfile,
    tonConnectUI: null,
    tokens: getDefaultTokens(initialAddress),

    setTonConnectUI: (instance: any) => {
      set({ tonConnectUI: instance });
    },

    connectWallet: (address?: string) => {
      if (typeof address === 'string') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_wallet_address', address);
        }

        const storedKey = `vc_profile_${address}`;
        const storedProfile = typeof window !== 'undefined' ? localStorage.getItem(storedKey) : null;
        let activeProfile: UserProfile;

        if (storedProfile) {
          activeProfile = JSON.parse(storedProfile);
          activeProfile.walletAddress = address;
          // Ensure experience/trial balances are completely removed (always 0)
          activeProfile.trialBalance = 0;
          activeProfile.balanceTON = activeProfile.realChainBalanceTON || 0;
          activeProfile.balanceVC = activeProfile.balanceVC || 0;
        } else {
          activeProfile = {
            walletAddress: address,
            username: `VibeDev_${address.slice(0, 4)}...${address.slice(-4)}`,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${address}`,
            balanceTON: 0,
            balanceVC: 0, // No longer gifting 1000 VC
            trialBalance: 0, // No longer gifting 15 TON
            isRegistered: true,
            role: 'both',
            createdAt: new Date().toISOString(),
            realChainBalanceTON: 0,
            localOffsetTON: 0,
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem(storedKey, JSON.stringify(activeProfile));
          }
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_user_profile', JSON.stringify(activeProfile));
        }

        set({
          walletAddress: address,
          isConnected: true,
          profile: activeProfile,
          tokens: getDefaultTokens(address)
        });
      } else {
        const ui = get().tonConnectUI;
        if (ui) {
          ui.openModal();
        } else {
          console.warn('TonConnect UI is not initialized yet.');
        }
      }
    },

    disconnectWallet: () => {
      const ui = get().tonConnectUI;
      if (ui && ui.connected) {
        ui.disconnect();
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('vc_wallet_address');
          localStorage.removeItem('vc_user_profile');
        }
        set({
          walletAddress: null,
          isConnected: false,
          profile: null,
          tokens: getDefaultTokens(null)
        });
      }
    },

    updateProfile: (updates) => {
      set((state) => {
        if (!state.profile || !state.walletAddress) return {};

        const newProfile = { ...state.profile, ...updates };

        // Maintain compatibility with balance calculations
        if (updates.realChainBalanceTON !== undefined) {
          newProfile.realChainBalanceTON = updates.realChainBalanceTON;
          const localOffset = newProfile.localOffsetTON || 0;
          newProfile.balanceTON = Number((updates.realChainBalanceTON + localOffset).toFixed(2));
        } else if (updates.balanceTON !== undefined) {
          const prevBalance = state.profile.balanceTON;
          const diff = updates.balanceTON - prevBalance;
          const currentOffset = state.profile.localOffsetTON || 0;

          newProfile.localOffsetTON = Number((currentOffset + diff).toFixed(2));
          const realChain = newProfile.realChainBalanceTON || 0;
          newProfile.balanceTON = Number((realChain + newProfile.localOffsetTON).toFixed(2));
        }

        if (typeof window !== 'undefined') {
          const storedKey = `vc_profile_${state.walletAddress}`;
          localStorage.setItem(storedKey, JSON.stringify(newProfile));
          localStorage.setItem('vc_user_profile', JSON.stringify(newProfile));
        }

        return { profile: newProfile };
      });
    },

    addFunds: (tonAmount, vcAmount = 0) => {
      // Local preview offset increase (fallback faucet functionality for UI components)
      const { profile, updateProfile, tokens } = get();
      if (!profile) return;

      const newTON = Number((profile.balanceTON + tonAmount).toFixed(2));
      const newVC = Number((profile.balanceVC + vcAmount).toFixed(2));

      updateProfile({
        balanceTON: newTON,
        balanceVC: newVC,
      });

      // Update values in tokens array too
      const nextTokens = tokens.map(t => {
        if (t.masterAddress === 'native') {
          return { ...t, balance: newTON };
        }
        if (t.symbol === 'VC') {
          return { ...t, balance: newVC };
        }
        return t;
      });
      set({ tokens: nextTokens });
    },

    addToken: async (masterAddress: string): Promise<boolean> => {
      const { walletAddress, tokens } = get();
      if (!walletAddress) return false;

      const cleanMaster = masterAddress.trim();
      if (!cleanMaster) return false;

      // Check if already exists
      const exists = tokens.some(t => normalizeAddress(t.masterAddress) === normalizeAddress(cleanMaster));
      if (exists) return true;

      try {
        const tonapiBase = getTonapiBase();
        const res = await fetch(`${tonapiBase}/v2/jettons/${cleanMaster}`);
        if (!res.ok) {
          throw new Error('Failed to fetch token metadata');
        }

        const data = await res.json() as any;
        const meta = data.metadata;
        if (!meta) return false;

        const newToken: TokenInfo = {
          masterAddress: cleanMaster,
          symbol: meta.symbol || 'UNKNOWN',
          name: meta.name || 'Unknown Token',
          decimals: typeof meta.decimals === 'number' ? meta.decimals : 9,
          image: meta.image || 'https://raw.githubusercontent.com/tonkeeper/opentonapi/master/pkg/references/media/token_placeholder.png',
          balance: 0
        };

        // Try to fetch initial balance for this specific account
        try {
          const balRes = await fetch(`${tonapiBase}/v2/accounts/${walletAddress}/jettons`);
          if (balRes.ok) {
            const balData = await balRes.ok ? await balRes.json() : null;
            if (balData && balData.balances) {
              const matched = balData.balances.find((b: any) => normalizeAddress(b.jetton.address) === normalizeAddress(cleanMaster));
              if (matched) {
                newToken.balance = Number(matched.balance) / Math.pow(10, newToken.decimals);
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch initial balance for custom jetton:', e);
        }

        // Add to tracked tokens list and persist in localStorage
        const updatedTokens = [...tokens, newToken];
        set({ tokens: updatedTokens });

        const customOnly = updatedTokens.slice(3); // slice out native, usdt, vc
        localStorage.setItem(`vc_custom_tokens_${walletAddress}`, JSON.stringify(customOnly));
        return true;
      } catch (err) {
        console.error('Failed to import Jetton token:', err);
        // Fallback placeholder metadata so user can at least view it
        const fallbackToken: TokenInfo = {
          masterAddress: cleanMaster,
          symbol: 'Imported',
          name: `${cleanMaster.slice(0, 4)}...${cleanMaster.slice(-4)}`,
          decimals: 9,
          image: 'https://raw.githubusercontent.com/tonkeeper/opentonapi/master/pkg/references/media/token_placeholder.png',
          balance: 0
        };

        const updatedTokens = [...tokens, fallbackToken];
        set({ tokens: updatedTokens });

        const customOnly = updatedTokens.slice(3);
        localStorage.setItem(`vc_custom_tokens_${walletAddress}`, JSON.stringify(customOnly));
        return true;
      }
    },

    updateTokenBalances: (tonBalance: number, jettonBalances: any[]) => {
      const { tokens, profile, updateProfile } = get();

      const updated = tokens.map(t => {
        if (t.masterAddress === 'native') {
          return { ...t, balance: tonBalance };
        }

        // Find balance in on-chain jetton list
        const matched = jettonBalances.find(jb => normalizeAddress(jb.jetton.address) === normalizeAddress(t.masterAddress));
        if (matched) {
          const rawBal = Number(matched.balance);
          const balance = Number((rawBal / Math.pow(10, t.decimals)).toFixed(4));
          return { ...t, balance };
        }

        // Keep local balance if it's VC mock and has not been deployed on-chain yet
        if (t.symbol === 'VC' && t.masterAddress.includes('Mock')) {
          return { ...t, balance: profile?.balanceVC || 0 };
        }

        return { ...t, balance: 0 };
      });

      // Find VC and update profile balance for compatibility
      const vcToken = updated.find(t => t.symbol === 'VC');
      const usdtToken = updated.find(t => t.symbol === 'USDT');
      const updates: Partial<UserProfile> = {
        realChainBalanceTON: tonBalance
      };
      if (vcToken) {
        updates.balanceVC = vcToken.balance;
      }

      set({ tokens: updated });
      updateProfile(updates);
    }
  };
});

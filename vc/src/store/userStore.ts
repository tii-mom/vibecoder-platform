import { create } from 'zustand';
import { UserProfile } from '../types';

interface UserState {
  walletAddress: string | null;
  isConnected: boolean;
  profile: UserProfile | null;
  tonConnectUI: any | null;
  connectWallet: (address?: string) => void;
  disconnectWallet: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  addFunds: (tonAmount: number, vcAmount?: number) => void;
  setTonConnectUI: (instance: any) => void;
}

export const useUserStore = create<UserState>((set, get) => {
  // Load initial state safely from localStorage
  const storedAddress = typeof window !== 'undefined' ? localStorage.getItem('vc_wallet_address') : null;
  const storedProfile = typeof window !== 'undefined' ? localStorage.getItem('vc_user_profile') : null;

  const initialAddress = storedAddress || null;
  const initialProfile: UserProfile | null = storedProfile
    ? JSON.parse(storedProfile)
    : null;

  return {
    walletAddress: initialAddress,
    isConnected: !!initialAddress,
    profile: initialProfile,
    tonConnectUI: null,

    setTonConnectUI: (instance: any) => {
      set({ tonConnectUI: instance });
    },

    connectWallet: (address?: string) => {
      if (typeof address === 'string') {
        // Called by TonConnectSync when connection is detected
        if (typeof window !== 'undefined') {
          localStorage.setItem('vc_wallet_address', address);
        }

        const storedKey = `vc_profile_${address}`;
        const storedProfile = typeof window !== 'undefined' ? localStorage.getItem(storedKey) : null;
        let activeProfile: UserProfile;

        if (storedProfile) {
          activeProfile = JSON.parse(storedProfile);
          // Just make sure it uses the correct address
          activeProfile.walletAddress = address;
        } else {
          activeProfile = {
            walletAddress: address,
            username: `VibeDev_${address.slice(0, 4)}...${address.slice(-4)}`,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${address}`,
            balanceTON: 0, // sync component will update this
            balanceVC: 0,
            trialBalance: 15,
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

        set({ walletAddress: address, isConnected: true, profile: activeProfile });
      } else {
        // Called programmatically by Connect buttons in UI without args
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
        // Normal store cleanup
        if (typeof window !== 'undefined') {
          localStorage.removeItem('vc_wallet_address');
          localStorage.removeItem('vc_user_profile');
        }
        set({ walletAddress: null, isConnected: false, profile: null });
      }
    },

    updateProfile: (updates) => {
      set((state) => {
        if (!state.profile || !state.walletAddress) return {};

        const newProfile = { ...state.profile, ...updates };

        // Handle balance calculation via offsets
        if (updates.realChainBalanceTON !== undefined) {
          // Blockchain balance sync
          newProfile.realChainBalanceTON = updates.realChainBalanceTON;
          const localOffset = newProfile.localOffsetTON || 0;
          newProfile.balanceTON = Number((updates.realChainBalanceTON + localOffset).toFixed(2));
        } else if (updates.balanceTON !== undefined) {
          // Local simulation adjustment (e.g. Spark, Swap)
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
      const { profile, updateProfile } = get();
      if (!profile) return;

      const newTON = Number((profile.balanceTON + tonAmount).toFixed(2));
      const newVC = Number((profile.balanceVC + vcAmount).toFixed(2));

      updateProfile({
        balanceTON: newTON,
        balanceVC: newVC,
      });
    },
  };
});

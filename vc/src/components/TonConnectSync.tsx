import { useEffect } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { useUserStore } from '../store/userStore';
import { TONService } from '../services/ton';

export default function TonConnectSync() {
  const address = useTonAddress();
  const { walletAddress, connectWallet, disconnectWallet, updateProfile } = useUserStore();

  // Sync connection state
  useEffect(() => {
    if (address) {
      if (walletAddress !== address) {
        connectWallet(address);
      }
    } else {
      if (walletAddress !== null) {
        disconnectWallet();
      }
    }
  }, [address, walletAddress, connectWallet, disconnectWallet]);

  // Poll real blockchain TON and VC Jetton balances on testnet
  useEffect(() => {
    if (!address) return;

    const fetchBalance = async () => {
      const updates: { realChainBalanceTON?: number; balanceVC?: number } = {};

      try {
        const response = await fetch(`https://testnet.toncenter.com/api/v2/getAddressBalance?address=${address}`);
        if (response.ok) {
          const data = await response.json();
          if (data.ok) {
            const balanceNano = data.result;
            updates.realChainBalanceTON = Number((Number(balanceNano) / 1000000000).toFixed(2));
          }
        }
      } catch (e) {
        console.error('Failed to fetch testnet TON balance:', e);
      }

      try {
        updates.balanceVC = await TONService.fetchVCJettonBalance(address);
      } catch (e) {
        console.error('Failed to fetch testnet VC Jetton balance:', e);
      }

      if (updates.realChainBalanceTON !== undefined || updates.balanceVC !== undefined) {
        // realChainBalanceTON remains the TON balance; balanceVC is synced from the VC testnet Jetton wallet.
        updateProfile(updates);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [address, updateProfile]);

  return null;
}

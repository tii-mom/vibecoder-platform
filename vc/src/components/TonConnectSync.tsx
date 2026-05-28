import { useEffect } from 'react';
import { useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { useUserStore } from '../store/userStore';

export default function TonConnectSync() {
  const address = useTonAddress();
  const wallet = useTonWallet();
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

  // Poll real blockchain balance on testnet
  useEffect(() => {
    if (!address) return;

    const fetchBalance = async () => {
      try {
        const response = await fetch(`https://testnet.toncenter.com/api/v2/getAddressBalance?address=${address}`);
        if (response.ok) {
          const data = await response.json();
          if (data.ok) {
            const balanceNano = data.result;
            const balanceTON = Number((Number(balanceNano) / 1000000000).toFixed(2));
            
            // Pass realChainBalanceTON to updateProfile to recalculate displayed balance
            updateProfile({
              realChainBalanceTON: balanceTON
            } as any);
          }
        }
      } catch (e) {
        console.error('Failed to fetch testnet TON balance:', e);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [address, updateProfile]);

  return null;
}

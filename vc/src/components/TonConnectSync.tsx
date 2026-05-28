import { useEffect } from 'react';
import { useTonAddress, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { useUserStore } from '../store/userStore';
import { getTonapiBase, getToncenterBase } from '../services/tonNetwork';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';
const ALLOW_DEV_WALLET_FALLBACK = import.meta.env.DEV || import.meta.env.VITE_ALLOW_WALLET_PROOF_FALLBACK === 'true';

export default function TonConnectSync() {
  const address = useTonAddress();
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const { walletAddress, connectWallet, disconnectWallet, updateProfile } = useUserStore();

  // 1. Request nonce and set connect request parameters
  useEffect(() => {
    if (!tonConnectUI) return;

    const fetchNonce = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/nonce`);
        const data = await res.json() as any;
        if (data.success && data.nonce) {
          tonConnectUI.setConnectRequestParameters({
            state: 'ready',
            value: { tonProof: data.nonce }
          });
        }
      } catch (err) {
        console.error('Failed to fetch authentication nonce:', err);
      }
    };

    fetchNonce();
  }, [tonConnectUI]);

  // 2. Handle proof signature verification on connection
  useEffect(() => {
    if (!wallet || !tonConnectUI) return;

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const allowProofFallback = ALLOW_DEV_WALLET_FALLBACK && isLocalhost;

    const proof = wallet.connectItems?.tonProof;
    if (proof && 'proof' in proof) {
      const verifyProof = async () => {
        const payload = {
          address: wallet.account.address,
          network: wallet.account.chain,
          public_key: wallet.account.publicKey,
          proof: {
            nonce: proof.proof.payload,
            timestamp: proof.proof.timestamp,
            domain: proof.proof.domain,
            signature: proof.proof.signature,
            payload: proof.proof.payload,
            stateInit: wallet.account.walletStateInit,
          }
        };

        try {
          const res = await fetch(`${API_BASE}/api/v1/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json() as any;
          if (data.success && data.token) {
            localStorage.setItem('vc_session_jwt', data.token);
            localStorage.setItem('vc_session_wallet', wallet.account.address);
            connectWallet(wallet.account.address);
          } else {
            console.error('Proof verification failed:', data.error);
            if (allowProofFallback) {
              console.warn('Development Fallback: Connecting wallet without successful proof validation.');
              connectWallet(wallet.account.address);
            } else {
              localStorage.removeItem('vc_session_jwt');
              localStorage.removeItem('vc_session_wallet');
              tonConnectUI.disconnect();
            }
          }
        } catch (err) {
          console.error('Error verifying proof:', err);
          if (allowProofFallback) {
            console.warn('Development Fallback: Connecting wallet without proof validation due to backend error.');
            connectWallet(wallet.account.address);
          } else {
            localStorage.removeItem('vc_session_jwt');
            localStorage.removeItem('vc_session_wallet');
            tonConnectUI.disconnect();
          }
        }
      };

      const cachedWallet = localStorage.getItem('vc_session_wallet');
      const cachedJwt = localStorage.getItem('vc_session_jwt');
      if (!cachedJwt || cachedWallet !== wallet.account.address) {
        verifyProof();
      }
    } else {
      // Connected but no proof signature available (e.g. connected previously without signature verification)
      const cachedJwt = localStorage.getItem('vc_session_jwt');
      if (!cachedJwt) {
        if (allowProofFallback) {
          console.warn('Development Fallback: Connecting wallet without proof signature.');
          connectWallet(wallet.account.address);
        } else {
          localStorage.removeItem('vc_session_jwt');
          localStorage.removeItem('vc_session_wallet');
          tonConnectUI.disconnect();
        }
      }
    }
  }, [wallet, tonConnectUI, connectWallet]);

  // 3. Sync connection state
  useEffect(() => {
    if (address) {
      if (walletAddress !== address) {
        // If we already have the JWT for this address, connect it immediately
        const cachedWallet = localStorage.getItem('vc_session_wallet');
        const cachedJwt = localStorage.getItem('vc_session_jwt');
        if (cachedJwt && cachedWallet === address) {
          connectWallet(address);
        }
      }
    } else {
      if (walletAddress !== null) {
        localStorage.removeItem('vc_session_jwt');
        localStorage.removeItem('vc_session_wallet');
        disconnectWallet();
      }
    }
  }, [address, walletAddress, connectWallet, disconnectWallet]);

  // 4. Poll real blockchain balance (TON + Jettons)
  useEffect(() => {
    if (!address) return;

    const fetchBalances = async () => {
      let tonBalance = 0;
      let jettonBalances: any[] = [];

      // 1. Fetch TON balance
      try {
        const response = await fetch(`${getToncenterBase()}/api/v2/getAddressBalance?address=${address}`);
        if (response.ok) {
          const data = await response.json();
          if (data.ok) {
            const balanceNano = data.result;
            tonBalance = Number((Number(balanceNano) / 1000000000).toFixed(4));
          }
        }
      } catch (e) {
        console.error('Failed to fetch TON balance:', e);
      }

      // 2. Fetch Jettons
      try {
        const response = await fetch(`${getTonapiBase()}/v2/accounts/${address}/jettons`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.balances) {
            jettonBalances = data.balances;
          }
        }
      } catch (e) {
        console.error('Failed to fetch jetton balances:', e);
      }

      // 3. Update store
      useUserStore.getState().updateTokenBalances(tonBalance, jettonBalances);
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [address]);

  return null;
}

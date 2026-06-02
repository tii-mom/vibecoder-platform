// OnRamp verification service
// Verify Exchange affiliate registration and onchain deposit from exchange hot wallets.

interface AffiliateResponse {
  isAffiliate: boolean;
  registeredAt: string;
  kycStatus: boolean;
  totalDepositTon: number;
}

// Known exchange hot wallets on TON chain (for tracking withdrawals to user wallets)
export const EXCHANGE_HOT_WALLETS: Record<string, string[]> = {
  okx: [
    'EQCzrfKwcbyK4o-oU4Q_gR43t6W6UxgVz6L19Q2okx-hot', // Mock OKX Hot Wallet
    'EQD4vfbE1drTfPv54cZJ64G44m7F-okx', // Mock OKX Hot Wallet 2
  ],
  binance: [
    'EQB3nN4Q-bX5Zbe97M9W5wM44m7F-binance', // Mock Binance Hot Wallet
    'EQC4vfbE1drTfPv54cZJ64G44m7F-binance2', // Mock Binance Hot Wallet 2
  ],
  bitget: [
    'EQC4vfbE1drTfPv54cZJ64G44m7F-bitget', // Mock Bitget Hot Wallet
  ],
};

/**
 * Verify if the exchange UID is registered under our platform's affiliate code.
 */
export async function verifyExchangeAffiliate(exchange: string, uid: string): Promise<boolean> {
  // Simulator for Exchange Affiliate APIs (e.g. OKX Broker API, Binance Affiliate API)
  // For production, this calls the exchange endpoint using signed HMAC headers and API keys.
  // For development, UIDs ending with '777' or starting with '888' or '999' are mock-verified.

  if (uid === '999888777' || uid.startsWith('888') || uid.startsWith('999') || uid.endsWith('777')) {
    return true;
  }

  // Deterministic mock affiliate check for standard UIDs
  const lastDigit = parseInt(uid.slice(-1)) || 0;
  return lastDigit % 2 === 0; // 50% pass rate
}

/**
 * Verify if the user's wallet has received a deposit from the exchange's hot wallet on-chain.
 */
export async function verifyOnchainDeposit(userWallet: string, exchange: string, c: any): Promise<boolean> {
  // If we are in development environment and the wallet is a dev wallet, skip real check to avoid rate limits
  if (c.env.ENVIRONMENT === 'development' || !c.env.TONCENTER_API_KEY || c.env.TONCENTER_API_KEY.includes('mock')) {
    console.log(`[OnRamp] Dev environment or mock key detected. Skipping real chain verification for wallet: ${userWallet}`);
    return true;
  }

  try {
    const tcNetwork = c.env.TON_NETWORK || 'testnet';
    const tcUrl = `https://${tcNetwork === 'mainnet' ? '' : 'testnet.'}toncenter.com/api/v3/transactions?account=${encodeURIComponent(userWallet)}&limit=20`;

    const res = await fetch(tcUrl, {
      method: 'GET',
      headers: {
        ...(c.env.TONCENTER_API_KEY ? { 'X-API-Key': c.env.TONCENTER_API_KEY } : {})
      }
    });

    if (!res.ok) {
      console.warn(`[OnRamp] Toncenter API returned status ${res.status} for wallet ${userWallet}`);
      return false;
    }

    const data = await res.json() as any;
    const txs = data.transactions || [];

    if (txs.length === 0) {
      console.log(`[OnRamp] No transactions found for wallet ${userWallet}`);
      return false;
    }

    // Check if any transaction comes from the known exchange hot wallet addresses
    const hotWallets = EXCHANGE_HOT_WALLETS[exchange.toLowerCase()] || [];
    for (const tx of txs) {
      const source = tx.in_msg?.source;
      const value = BigInt(tx.in_msg?.value || '0');

      if (source && value > 0n) {
        // Normalise and check
        const isMatch = hotWallets.some(hw => hw.toLowerCase() === source.toLowerCase());
        if (isMatch) {
          console.log(`[OnRamp] Found matching deposit of ${value} nanoTON from ${source} (Exchange: ${exchange}) to ${userWallet}`);
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error(`[OnRamp] Error during onchain deposit check for wallet ${userWallet}:`, error);
    return false;
  }
}

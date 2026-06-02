const NANO_FACTOR = 1_000_000_000;
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';
const TONCENTER_TESTNET_V3 = 'https://testnet.toncenter.com/api/v3';
const DEFAULT_VC_JETTON = 'UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf';

interface PlatformContract {
  contract_name?: string;
  name?: string;
  key?: string;
  address?: string;
}

interface PlatformContractsResponse {
  success?: boolean;
  data?: PlatformContract[] | Record<string, string>;
  contracts?: PlatformContract[] | Record<string, string>;
  VC_JETTON?: string;
}

interface ToncenterJettonWallet {
  address?: string;
  balance?: string | number;
  jetton?: string;
  jetton_address?: string;
  owner?: string;
  owner_address?: string;
  metadata?: {
    decimals?: string | number;
  };
}

interface ToncenterJettonWalletsResponse {
  jetton_wallets?: ToncenterJettonWallet[];
  wallets?: ToncenterJettonWallet[];
  data?: ToncenterJettonWallet[];
}

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
};

const resolveContractAddress = (payload: PlatformContractsResponse): string | null => {
  if (payload.VC_JETTON) return payload.VC_JETTON;

  const contracts = payload.data || payload.contracts;

  if (Array.isArray(contracts)) {
    const vcContract = contracts.find((contract) => {
      const contractName = contract.contract_name || contract.name || contract.key || '';
      return contractName.toUpperCase() === 'VC_JETTON';
    });

    return vcContract?.address || null;
  }

  if (contracts && typeof contracts === 'object') {
    return contracts.VC_JETTON || contracts.vc_jetton || null;
  }

  return null;
};

const formatTokenBalance = (rawBalance: string | number, decimals = 9): number => {
  const raw = String(rawBalance);

  if (!/^\d+$/.test(raw)) return 0;

  const whole = decimals > 0 ? raw.slice(0, -decimals) || '0' : raw;
  const fraction = decimals > 0 ? raw.slice(-decimals).padStart(decimals, '0') : '';
  const parsedBalance = Number(`${whole}.${fraction}`);

  if (!Number.isFinite(parsedBalance)) return 0;

  const precision = parsedBalance >= 100 ? 2 : 4;

  return Number(parsedBalance.toFixed(precision));
};

export const TONService = {
  VC_JETTON_FALLBACK: DEFAULT_VC_JETTON,

  shortenAddress: (address: string): string => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  },
  convertToTON: (nanoTON: string | number): number => {
    return Number(nanoTON) / NANO_FACTOR;
  },
  convertToNanoTON: (ton: string | number): bigint => {
    return BigInt(Math.floor(Number(ton) * NANO_FACTOR));
  },
  getVCJettonAddress: async (): Promise<string> => {
    try {
      const payload = await fetchJson<PlatformContractsResponse>(`${API_BASE}/api/v1/platform/contracts`);
      return resolveContractAddress(payload) || DEFAULT_VC_JETTON;
    } catch (error) {
      console.error('Failed to resolve VC_JETTON contract, using fallback:', error);
      return DEFAULT_VC_JETTON;
    }
  },
  fetchVCJettonBalance: async (ownerAddress: string): Promise<number> => {
    if (!ownerAddress) return 0;

    const jettonAddress = await TONService.getVCJettonAddress();
    const query = new URLSearchParams({
      owner_address: ownerAddress,
      jetton_address: jettonAddress,
      limit: '1',
    });

    const payload = await fetchJson<ToncenterJettonWalletsResponse>(`${TONCENTER_TESTNET_V3}/jetton/wallets?${query.toString()}`);
    const wallets = payload.jetton_wallets || payload.wallets || payload.data || [];
    const wallet = wallets[0];

    if (!wallet?.balance) return 0;

    const decimals = Number(wallet.metadata?.decimals ?? 9);
    return formatTokenBalance(wallet.balance, Number.isFinite(decimals) ? decimals : 9);
  },
};

import { getTonNetwork } from './tonNetwork';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

export type PlatformContractName =
  | 'VC_JETTON'
  | 'FUND'
  | 'VC_REWARD_POOL'
  | 'EARLY_FUNDRAISING'
  | 'LAUNCH_FEE'
  | 'TOKEN_LAUNCHER';

export const REQUIRED_CONTRACTS: PlatformContractName[] = [
  'VC_JETTON',
  'FUND',
  'VC_REWARD_POOL',
  'EARLY_FUNDRAISING',
  'LAUNCH_FEE',
  'TOKEN_LAUNCHER',
];

interface PlatformContractEntry {
  contract_name: string;
  address: string;
  network: string;
}

interface PlatformContractsResponse {
  success: boolean;
  network: string;
  data: PlatformContractEntry[];
  missing?: string[];
  invalidAddresses?: string[];
}

let cachedContracts: Map<string, PlatformContractEntry> | null = null;
let cachedNetwork: string | null = null;

export async function fetchPlatformContracts(): Promise<PlatformContractsResponse> {
  const res = await fetch(`${API_BASE}/api/v1/platform/contracts`, {
    signal: AbortSignal.timeout(5000),
  });
  const data = await res.json() as PlatformContractsResponse;

  if (data.success && data.data) {
    const map = new Map<string, PlatformContractEntry>();
    for (const entry of data.data) {
      map.set(entry.contract_name, entry);
    }
    cachedContracts = map;
    cachedNetwork = data.network;
  }

  return data;
}

export function getPlatformContract(name: PlatformContractName): string | undefined {
  return cachedContracts?.get(name)?.address;
}

export function getCachedContracts(): Map<string, PlatformContractEntry> | null {
  return cachedContracts;
}

export function getCachedNetwork(): string | null {
  return cachedNetwork;
}

export function assertRequiredContracts(): string[] {
  const missing: string[] = [];
  if (!cachedContracts) return REQUIRED_CONTRACTS.slice();
  for (const name of REQUIRED_CONTRACTS) {
    if (!cachedContracts.has(name)) {
      missing.push(name);
    }
  }
  return missing;
}

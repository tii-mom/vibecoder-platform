export * from './agent';
export * from './spark';
export * from './token';
export * from './governance';

export interface UserProfile {
  walletAddress: string;
  username: string;
  avatar: string;
  balanceTON: number;
  balanceVC: number;
  trialBalance: number;
  isRegistered: boolean;
  role: 'developer' | 'investor' | 'both';
  createdAt: string;
  referralsCount?: number;
  hasClaimedTrial?: boolean;
  hasUsedTrial?: boolean;
  hasGasConsumption?: boolean;
  realChainBalanceTON?: number;
  localOffsetTON?: number;
  telegramId?: number;
  telegramUsername?: string;
  telegramAuthDate?: number;
}

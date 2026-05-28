export interface GovernanceProposal {
  id: string;
  projectId: string;
  amount: number; // TON amount to withdraw
  purpose: string; // withdrawal purpose description
  yesWeight: number; // total square-root voting weight for YES
  noWeight: number; // total square-root voting weight for NO
  status: 'active' | 'passed' | 'rejected';
  createdAt: string;
  expiresAt: string;
  votedAddresses?: string[]; // track who has voted in current sandbox state
  votesCount?: { yes: number; no: number };
}

export interface GovernanceVote {
  id: string;
  proposalId: string;
  userAddress: string;
  weight: number; // sqrt(token_balance)
  vote: 'yes' | 'no';
  createdAt: string;
}

export interface ExitRequest {
  id: string;
  projectId: string;
  userAddress: string;
  redeemedTON: number;
  burnedTokens: number;
  createdAt: string;
}

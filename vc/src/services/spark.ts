// STUB: Mock Service for Sandbox
import { SparkProject } from '../types';

export const SparkAPI = {
  getStats: async () => {
    return {
      totalAgents: 42,
      totalRaisedTON: 148900,
      activeInvestors: 1850,
      developerIncomeUSD: 382000
    };
  }
};

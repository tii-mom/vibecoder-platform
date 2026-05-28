export interface TokenInfo {
  id: string;
  name: string;
  symbol: string;
  price: number; // in TON
  priceChange24h: number; // percentage
  marketCap: number; // in TON
  volume24h: number; // in TON
  totalSupply: number;
  circulatingSupply: number;
  holderCount: number;
  chartData: Array<{
    time: string;
    price: number;
    volume: number;
  }>;
}

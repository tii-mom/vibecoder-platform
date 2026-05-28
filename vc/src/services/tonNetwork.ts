export type TonNetwork = 'mainnet' | 'testnet';

export function getTonNetwork(): TonNetwork {
  return import.meta.env.VITE_TON_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
}

export function getTonapiBase(network: TonNetwork = getTonNetwork()): string {
  return network === 'mainnet' ? 'https://tonapi.io' : 'https://testnet.tonapi.io';
}

export function getToncenterBase(network: TonNetwork = getTonNetwork()): string {
  return network === 'mainnet' ? 'https://toncenter.com' : 'https://testnet.toncenter.com';
}

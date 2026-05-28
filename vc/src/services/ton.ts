export const TONService = {
  shortenAddress: (address: string): string => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  },
  convertToTON: (nanoTON: string | number): number => {
    return Number(nanoTON) / 1000000000;
  },
  convertToNanoTON: (ton: string | number): bigint => {
    return BigInt(Math.floor(Number(ton) * 1000000000));
  }
};

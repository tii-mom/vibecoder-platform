// Mint 900M VC + Distribute + Revoke
// npx tsx scripts/mint-vc.ts

import { TonClient, WalletContractV4, internal, toNano, beginCell, Address } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import 'dotenv/config';

const MNEMONIC_RAW = requireEnv('DEPLOYER_MNEMONIC');
const MNEMONIC = MNEMONIC_RAW.replace(/"/g, '').replace(/\u00a0/g, ' ').trim();

const VC_JETTON = parseAddressEnv('VC_JETTON');
const FUND = parseAddressEnv('FUND');
const STRATEGIC = parseAddressEnv('STRATEGIC');
const EARLY_FUNDRAISING = parseAddressEnv('EARLY_FUNDRAISING');
const LIQUIDITY = parseAddressEnv('LIQUIDITY');
const VC_REWARD_POOL = parseAddressEnv('VC_REWARD_POOL');
const DEPLOYER = parseAddressEnv('DEPLOYER_WALLET');

const TONCENTER_KEY = requireEnv('TONCENTER_API_KEY');

function requireEnv(name: string): string {
  const value = process.env[name]?.replace(/\u00a0/g, ' ').trim();
  if (!value) {
    throw new Error(`Missing required env ${name}. Refusing to mint with a fallback or stale address.`);
  }
  return value;
}

function parseAddressEnv(name: string): Address {
  try {
    return Address.parse(requireEnv(name));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid TON address in env ${name}: ${message}`);
  }
}

async function main() {
  const endpoint = `https://testnet.toncenter.com/api/v2/jsonRPC?api_key=${TONCENTER_KEY}`;
  const client = new TonClient({ endpoint });
  const keyPair = await mnemonicToPrivateKey(MNEMONIC.split(' '));
  const wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
  console.log('Deployer:', wallet.address.toString({ bounceable: false }));

  const dist = [
    { name: 'Fund (720M)',      to: FUND,      amount: 720_000_000n },
    { name: 'Strategic (72M)',  to: STRATEGIC,  amount: 72_000_000n },
    { name: 'Early Fundraising (45M)', to: EARLY_FUNDRAISING, amount: 45_000_000n },
    { name: 'Liquidity (45M)',         to: LIQUIDITY,          amount: 45_000_000n },
    { name: 'VC Reward Pool (18M)',    to: VC_REWARD_POOL,     amount: 18_000_000n },
  ];

  // Verify total
  let t = 0n; for (const d of dist) t += d.amount;
  console.log(`Total: ${t}M VC ${t === 900_000_000n ? '✅' : '❌'}\n`);

  for (const d of dist) {
    console.log(`Minting ${d.name}...`);
    const seqno = await clientRetry(() => wallet.getSeqno());
    await clientRetry(() => wallet.sendTransfer({
      seqno, secretKey: keyPair.secretKey,
      messages: [internal({
        to: VC_JETTON, value: toNano('0.05'),
        body: beginCell()
          .storeUint(21, 32).storeUint(0, 64)
          .storeAddress(d.to)
          .storeCoins(d.amount)        // loadCoins in contract reads as number
          .storeAddress(DEPLOYER)
          .storeCoins(0)
          .storeSlice(beginCell().endCell().beginParse())
          .endCell(),
      })],
    }));
    await sleep(6000);
    console.log(`  ✅ ${d.name}`);
  }

  // Revoke admin
  await sleep(3000);
  console.log('\nRevoking admin...');
  const sn = await clientRetry(() => wallet.getSeqno());
  await clientRetry(() => wallet.sendTransfer({
    seqno: sn, secretKey: keyPair.secretKey,
    messages: [internal({
      to: VC_JETTON, value: toNano('0.05'),
      body: beginCell()
        .storeUint(3, 32).storeUint(0, 64)
        .storeAddress(null)  // addr_none → zero/burn address
        .endCell(),
    })],
  }));
  await sleep(5000);
  console.log('✅ VC Jetton admin revoked');
}

async function clientRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 5; i++) {
    try { return await fn(); }
    catch (e: any) {
      if (i < 4 && e.message?.includes('500')) { await sleep(8000); }
      else { throw e; }
    }
  }
  throw new Error('Failed after retries');
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

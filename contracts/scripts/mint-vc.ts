// Mint 980M VC + Distribute
// npx tsx scripts/mint-vc.ts

import { TonClient, WalletContractV4, internal, toNano, beginCell, Address } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const MNEMONIC_RAW = process.env.DEPLOYER_MNEMONIC || '';
const MNEMONIC = MNEMONIC_RAW.replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
const TON_NETWORK = process.env.TON_NETWORK || 'testnet';
const MANIFEST_PATH = process.env.DEPLOYMENT_MANIFEST || resolve(process.cwd(), 'deployments', `${TON_NETWORK}.platform.json`);
const MANIFEST = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) : {};

const VC_JETTON = addressFromEnv('VC_JETTON_ADDRESS', manifestAddress('VC_JETTON'));
const FUND = addressFromEnv('VC_FUND_ADDRESS', manifestAddress('FUND'));
const REWARD_POOL = addressFromEnv('VC_REWARD_POOL_ADDRESS', manifestAddress('VC_REWARD_POOL'));
const DEVELOPER_INCENTIVES = addressFromEnv('VC_DEVELOPER_INCENTIVES_ADDRESS', REWARD_POOL.toString());
const ECOSYSTEM = addressFromEnv('VC_ECOSYSTEM_ADDRESS', REWARD_POOL.toString());
const TEAM_LOCKUP = addressFromEnv('VC_TEAM_LOCKUP_ADDRESS', 'UQBFKyg4osbhB7pRtzwcTmyCBuyPn4H3LJdHaWJ6HqIj5eH8');
const LIQUIDITY = addressFromEnv('VC_LIQUIDITY_ADDRESS', '0QDsx-vPapMJyIh3LYEQXAF_wp0iAWk8I6ZN7Vw79zqTDIjo');
const EARLY_FUNDRAISING = addressFromEnv('VC_EARLY_FUNDRAISING_ADDRESS', manifestAddress('EARLY_FUNDRAISING'));
const EARLY_OPS = addressFromEnv('VC_EARLY_OPS_ADDRESS');
const REVOKE_ADMIN = process.env.REVOKE_VC_ADMIN === '1';

const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';

async function main() {
  const endpoint = `https://testnet.toncenter.com/api/v2/jsonRPC?api_key=${TONCENTER_KEY}`;
  const client = new TonClient({ endpoint });
  const keyPair = await mnemonicToPrivateKey(MNEMONIC.split(' '));
  const wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
  const deployer = wallet.address;
  console.log('Deployer:', deployer.toString({ bounceable: false }));
  console.log('VC Jetton:', VC_JETTON.toString({ bounceable: false }));

  const dist = [
    { name: 'Developer Incentives (100M)',       to: DEVELOPER_INCENTIVES, amount: vc(100_000_000n) },
    { name: 'Platform Fund (250M)',              to: FUND,                 amount: vc(250_000_000n) },
    { name: 'Ecosystem Incentives (350M)',       to: ECOSYSTEM,            amount: vc(350_000_000n) },
    { name: 'Team Lockup (100M)',                to: TEAM_LOCKUP,          amount: vc(100_000_000n) },
    { name: 'Liquidity Pool (50M)',              to: LIQUIDITY,            amount: vc(50_000_000n) },
    { name: 'Early Fundraising (100M)',          to: EARLY_FUNDRAISING,    amount: vc(100_000_000n) },
    { name: 'Early Operations and Support (30M)', to: EARLY_OPS,           amount: vc(30_000_000n) },
  ];

  // Verify total
  let t = 0n; for (const d of dist) t += d.amount;
  console.log(`Total: ${t / 1_000_000_000n} VC ${t === vc(980_000_000n) ? '✅' : '❌'}\n`);

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
          .storeCoins(d.amount)
          .storeAddress(deployer)
          .storeCoins(0)
          .storeSlice(beginCell().endCell().beginParse())
          .endCell(),
      })],
    }));
    await sleep(6000);
    console.log(`  ✅ ${d.name}`);
  }

  if (REVOKE_ADMIN) {
    await sleep(3000);
    console.log('\nRevoking admin...');
    const sn = await clientRetry(() => wallet.getSeqno());
    await clientRetry(() => wallet.sendTransfer({
      seqno: sn, secretKey: keyPair.secretKey,
      messages: [internal({
        to: VC_JETTON, value: toNano('0.05'),
        body: beginCell()
          .storeUint(3, 32).storeUint(0, 64)
          .storeAddress(null)
          .endCell(),
      })],
    }));
    await sleep(5000);
    console.log('✅ VC Jetton admin revoked');
  } else {
    console.log('\nSkipped admin revoke. Set REVOKE_VC_ADMIN=1 to revoke after final verification.');
  }
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
function vc(amount: bigint) { return amount * 1_000_000_000n; }
function addressFromEnv(name: string, fallback?: string) {
  const raw = process.env[name] || fallback;
  if (!raw) throw new Error(`Set ${name} before running this script.`);
  return Address.parse(raw.trim());
}
function manifestAddress(name: string) {
  const address = MANIFEST?.contracts?.[name]?.address;
  if (!address) throw new Error(`Missing ${name} in ${MANIFEST_PATH}; deploy first or set ${name}_ADDRESS`);
  return address;
}
main().catch(console.error);

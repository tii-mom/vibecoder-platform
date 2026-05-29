// Mint 900M VC + Distribute + Revoke
// npx tsx scripts/mint-vc.ts

import { TonClient, WalletContractV4, internal, toNano, beginCell, Address } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import 'dotenv/config';

const MNEMONIC_RAW = process.env.DEPLOYER_MNEMONIC || '';
const MNEMONIC = MNEMONIC_RAW.replace(/"/g, '').replace(/\u00a0/g, ' ').trim();

const VC_JETTON = Address.parse('UQDwO6ai0zr0UVekU-NIqI_eCTKCICrkt2zGMnAzNJrk58dO');
const FUND = Address.parse('UQDVccelkngo4cX9KkkL109Mf7tYRlwLNC4zrj_cdKfbM8Ha');
const STRATEGIC = Address.parse('UQBFKyg4osbhB7pRtzwcTmyCBuyPn4H3LJdHaWJ6HqIj5eH8');
const EARLY_SUB = Address.parse('UQBSEb8LI6QZVDjFOLdV6i4cEYDlTJ7g-mY94l1u6F16t5QT');
const LIQUIDITY = Address.parse('UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq');
const DEPLOYER = Address.parse('UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq');

const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';

async function main() {
  const endpoint = `https://testnet.toncenter.com/api/v2/jsonRPC?api_key=${TONCENTER_KEY}`;
  const client = new TonClient({ endpoint });
  const keyPair = await mnemonicToPrivateKey(MNEMONIC.split(' '));
  const wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
  console.log('Deployer:', wallet.address.toString({ bounceable: false }));

  const dist = [
    { name: 'Fund (720M)',      to: FUND,      amount: 720_000_000n },
    { name: 'Strategic (72M)',  to: STRATEGIC,  amount: 72_000_000n },
    { name: 'Early Sub (45M)',  to: EARLY_SUB,  amount: 45_000_000n },
    { name: 'Liquidity (45M)',  to: LIQUIDITY,  amount: 45_000_000n },
    { name: 'Support (18M)',    to: DEPLOYER,   amount: 18_000_000n },
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
main().catch(console.error);

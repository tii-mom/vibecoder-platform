// Launch Campaign E2E Test
// npx tsx scripts/test-launch.ts

import { TonClient, WalletContractV4, internal, toNano, beginCell, Address, Cell } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { compile } from '@ton/blueprint';
import 'dotenv/config';

const MNEMONIC_RAW = process.env.DEPLOYER_MNEMONIC || '';
const MNEMONIC = MNEMONIC_RAW.replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';

async function main() {
  const endpoint = `https://testnet.toncenter.com/api/v2/jsonRPC?api_key=${TONCENTER_KEY}`;
  const client = new TonClient({ endpoint });
  const keyPair = await mnemonicToPrivateKey(MNEMONIC.split(' '));
  const wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
  console.log('Wallet:', wallet.address.toString({ bounceable: false }));

  // Compile contracts
  console.log('Compiling...');
  const campaignCode = await compile('LaunchCampaign');
  const jettonCode = await compile('ProjectToken');
  const walletCode = await compile('ProjectTokenWallet');
  const vestingCode = await compile('Vesting');

  // Deploy Launch Campaign
  const target = toNano('100'); // 100 TON target
  const threshold = toNano('55'); // 55 TON = 55%
  const deadline = Math.floor(Date.now() / 1000) + 86400; // 24h
  const deployer = wallet.address;

  const codesCell = beginCell()
    .storeRef(jettonCode).storeRef(walletCode).storeRef(vestingCode).endCell();
  const dictsCell = beginCell()
    .storeDict(null).storeDict(null).storeDict(null).storeDict(null)
    .storeUint(0, 32).storeCoins(0).storeCoins(0).storeCoins(0).endCell();
  const addrsCell = beginCell()
    .storeAddress(null)
    .storeAddress(deployer) // platform = deployer for test
    .storeAddress(deployer) // oracle = deployer for test
    .endCell();

  const dataCell = beginCell()
    .storeAddress(deployer)     // owner
    .storeCoins(target)
    .storeCoins(threshold)
    .storeCoins(0)               // raised
    .storeUint(deadline, 32)
    .storeBit(0)                // deployed
    .storeUint(1, 8)             // FUNDING status
    .storeCoins(toNano('30'))    // s1 target
    .storeUint(100, 32)          // s1 rate
    .storeUint(10, 32)           // s1 bonus
    .storeCoins(toNano('60'))    // s2 target
    .storeUint(80, 32)           // s2 rate
    .storeUint(60, 32)           // s3 rate
    .storeRef(codesCell)
    .storeRef(dictsCell)
    .storeRef(addrsCell)
    .endCell();

  // Deploy
  const stateInit = beginCell().storeUint(6, 5).storeRef(campaignCode).storeRef(dataCell).endCell();
  const campaignAddr = new Address(0, stateInit.hash());

  console.log('\nDeploying Launch Campaign...');
  const seqno = await clientRetry(() => wallet.getSeqno());
  await clientRetry(() => wallet.sendTransfer({
    seqno, secretKey: keyPair.secretKey,
    messages: [internal({
      to: campaignAddr, value: toNano('1'),
      init: { code: campaignCode, data: dataCell },
      body: beginCell().endCell(),
    })],
  }));
  await sleep(8000);

  const cAddr = campaignAddr.toString({ bounceable: false });
  console.log('Campaign:', cAddr);

  // Spark 1: 30 TON (below threshold 55)
  console.log('\nSpark 1: 30 TON...');
  const s1 = await clientRetry(() => wallet.getSeqno());
  await clientRetry(() => wallet.sendTransfer({
    seqno: s1, secretKey: keyPair.secretKey,
    messages: [internal({
      to: campaignAddr, value: toNano('30'),
      body: beginCell().storeUint(0x111, 32).storeUint(0, 64).endCell(),
    })],
  }));
  await sleep(6000);
  console.log('  ✅ Spark 1 done (raised: 30/100 TON)');

  // Check after spark 1
  try {
    const r1 = await client.runMethod(campaignAddr, 'getCampaignData');
    console.log('  Raised:', Number(r1.stack.readBigNumber()) / 1e9, 'TON');
  } catch(e) {}

  // Spark 2: 30 TON (total: 60 → crosses 55%)
  console.log('\nSpark 2: 30 TON (total reaches 60→55% threshold!)...');
  const s2 = await clientRetry(() => wallet.getSeqno());
  await clientRetry(() => wallet.sendTransfer({
    seqno: s2, secretKey: keyPair.secretKey,
    messages: [internal({
      to: campaignAddr, value: toNano('30'),
      body: beginCell().storeUint(0x111, 32).storeUint(0, 64).endCell(),
    })],
  }));
  await sleep(10000);

  // Verify
  console.log('\n=== Verification ===');
  try {
    const r = await client.runMethod(campaignAddr, 'getCampaignData');
    console.log('Raised:', Number(r.stack.readBigNumber()) / 1e9, 'TON');
    const deployed = r.stack.readBit();
    console.log('Token Deployed:', deployed);
    if (deployed) {
      r.stack.readAddress(); // token address
      r.stack.readAddress(); // platform
      r.stack.readAddress(); // oracle
      console.log('✅ 55% trigger WORKED! Token auto-deployed.');
    }
  } catch(e: any) {
    console.log('Get method failed:', e.message);
  }

  console.log('\nCampaign address:', cAddr);
  console.log('Check on: https://testnet.tonscan.org/address/' + cAddr);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

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

main().catch(console.error);

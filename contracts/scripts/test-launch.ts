// Launch Campaign E2E Test
// npx tsx scripts/test-launch.ts

import { TonClient4, WalletContractV4, internal, toNano, beginCell, Address, Cell } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { compile } from '@ton/blueprint';
import 'dotenv/config';

const MNEMONIC_RAW = process.env.DEPLOYER_MNEMONIC || '';
const MNEMONIC = MNEMONIC_RAW.replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
const TON_NETWORK = process.env.TON_NETWORK || 'testnet';
const isMainnet = TON_NETWORK === 'mainnet';

async function main() {
  const endpoint = isMainnet ? 'https://mainnet-v4.tonhubapi.com' : 'https://testnet-v4.tonhubapi.com';
  const client = new TonClient4({ endpoint });
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
  console.log('Deployment sent. Waiting for confirmation...');
  await sleep(15000);

  const cAddr = campaignAddr.toString({ bounceable: false });
  console.log('Campaign Address:', cAddr);

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
  console.log('Spark 1 sent. Waiting...');
  await sleep(15000);
  console.log('  ✅ Spark 1 done (raised: 30/100 TON)');

  // Check after spark 1
  try {
    const block1 = await client.getLastBlock();
    const r1 = await client.runMethod(block1.last.seqno, campaignAddr, 'getCampaignData');
    r1.reader.readAddress(); // owner
    r1.reader.readBigNumber(); // target
    r1.reader.readBigNumber(); // threshold
    console.log('  Raised:', Number(r1.reader.readBigNumber()) / 1e9, 'TON');
  } catch(e: any) {
    console.log('  Failed to read raised amount:', e.message);
  }

  // Spark 2: 30 TON (total: 60 → crosses 55%)
  console.log('\nSpark 2: 30 TON (total reaches 60 → 55% threshold!)...');
  const s2 = await clientRetry(() => wallet.getSeqno());
  await clientRetry(() => wallet.sendTransfer({
    seqno: s2, secretKey: keyPair.secretKey,
    messages: [internal({
      to: campaignAddr, value: toNano('30'),
      body: beginCell().storeUint(0x111, 32).storeUint(0, 64).endCell(),
    })],
  }));
  console.log('Spark 2 sent. Waiting for deployment to trigger...');
  await sleep(15000);

  // Send Mint Batch to distribute tokens to backers and transition status to STATUS_SUCCESS (2)
  console.log('\nSending Mint Batch: 0x777...');
  const s3 = await clientRetry(() => wallet.getSeqno());
  await clientRetry(() => wallet.sendTransfer({
    seqno: s3, secretKey: keyPair.secretKey,
    messages: [internal({
      to: campaignAddr, value: toNano('0.2'),
      body: beginCell().storeUint(0x777, 32).storeUint(0, 64).storeUint(10, 8).endCell(),
    })],
  }));
  console.log('Mint Batch sent. Waiting for mint completion...');
  await sleep(15000);

  // Verify
  console.log('\n=== Verification ===');
  try {
    const block2 = await client.getLastBlock();
    const r = await client.runMethod(block2.last.seqno, campaignAddr, 'getCampaignData');
    r.reader.readAddress(); // owner
    r.reader.readBigNumber(); // target
    r.reader.readBigNumber(); // threshold
    const raised = r.reader.readBigNumber();
    console.log('Final Raised:', Number(raised) / 1e9, 'TON');
    r.reader.readBigNumber(); // deadline
    const deployed = r.reader.readBigNumber() !== 0n;
    console.log('Token Deployed Flag:', deployed);
    if (deployed) {
      r.reader.readBigNumber(); // status
      const tokenAddr = r.reader.readAddressOpt(); // token address
      console.log('✅ 55% trigger WORKED! Token auto-deployed.');
      console.log('Token Master Address:', tokenAddr ? tokenAddr.toString() : 'None');
    } else {
      console.log('❌ Token not deployed yet. Status on-chain did not cross threshold or transaction bounced.');
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

// VibeCoder Deploy Script — TON Testnet
// npx tsx scripts/deploy.ts

import { TonClient, WalletContractV4, internal, toNano, beginCell } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { compile } from '@ton/blueprint';
import { Address } from '@ton/core';
import 'dotenv/config';

const MNEMONIC = process.env.DEPLOYER_MNEMONIC || '';
// Fix NBSP and quotes in mnemonic
const MNEMONIC_FIXED = MNEMONIC.replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
if (!MNEMONIC_FIXED || MNEMONIC_FIXED.split(' ').length < 12) throw new Error('Set valid DEPLOYER_MNEMONIC (24 words) in .env');

const endpoint = TONCENTER_KEY
  ? `https://testnet.toncenter.com/api/v2/jsonRPC?api_key=${TONCENTER_KEY}`
  : 'https://testnet.toncenter.com/api/v2/jsonRPC';

async function deployOne(client: TonClient, wallet: any, keyPair: any, codeCell: any, dataCell: any, value: bigint = toNano('0.1')): Promise<Address> {
  const stateInit = beginCell().storeUint(6, 5).storeRef(codeCell).storeRef(dataCell).endCell();
  const hash = stateInit.hash();
  const addr = new Address(0, hash);

  // Retry loop for TonCenter lite server sync issues
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const seqno = await wallet.getSeqno();
      await wallet.sendTransfer({
        seqno, secretKey: keyPair.secretKey,
        messages: [internal({ to: addr, value, init: { code: codeCell, data: dataCell }, body: beginCell().endCell() })]
      });
      await new Promise(r => setTimeout(r, 10000));
      return addr;
    } catch (e: any) {
      if (attempt < 4 && e.message?.includes('500')) {
        console.log(`  Retry ${attempt + 1}/5 after 10s...`);
        await new Promise(r => setTimeout(r, 10000));
      } else { throw e; }
    }
  }
  throw new Error('Failed after 5 retries');
}

async function main() {
  const client = new TonClient({ endpoint });
  const keyPair = await mnemonicToPrivateKey(MNEMONIC_FIXED.split(' '));
  const wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
  
  console.log(`Wallet: ${wallet.address.toString({bounceable: false})}\n`);
  
  // Compile all contracts
  const vcJettonCode = await compile('VcJetton');
  const walletCode = await compile('ProjectTokenWallet');
  const fundCode = await compile('Fund');
  const strategicCode = await compile('Strategic');
  const earlySubCode = await compile('EarlySubscription');
  const launchFeeCode = await compile('LaunchFee');
  const tokenLauncherCode = await compile('TokenLauncher');
  const projectTokenCode = await compile('ProjectToken');
  
  const deployer = wallet.address;

  // 1. VC Jetton
  console.log('[1/6] VC Jetton...');
  const vcJetton = await deployOne(client, wallet, keyPair, vcJettonCode,
    beginCell().storeCoins(0).storeAddress(deployer).storeRef(beginCell().storeUint(0,8).endCell()).storeRef(walletCode).endCell()
  );
  const vcAddr = vcJetton.toString({bounceable: false});
  console.log(`  VC Jetton: ${vcAddr}`);

  // 2. Fund  
  console.log('[2/6] Fund...');
  const fund = await deployOne(client, wallet, keyPair, fundCode,
    beginCell().storeAddress(deployer).storeAddress(vcJetton).storeRef(walletCode)
      .storeAddress(vcJetton).storeDict(null).storeDict(null).storeCoins(0).endCell()
  );
  console.log(`  Fund: ${fund.toString({bounceable: false})}`);

  // 3. Strategic
  console.log('[3/6] Strategic...');
  const strategic = await deployOne(client, wallet, keyPair, strategicCode,
    beginCell().storeAddress(deployer).storeAddress(vcJetton).storeRef(walletCode).storeAddress(vcJetton).endCell()
  );
  console.log(`  Strategic: ${strategic.toString({bounceable: false})}`);

  // 4. Early Subscription
  console.log('[4/6] Early Subscription...');
  const earlySub = await deployOne(client, wallet, keyPair, earlySubCode,
    beginCell().storeAddress(deployer).storeAddress(vcJetton).storeRef(walletCode)
      .storeAddress(vcJetton).storeUint(500, 32).storeCoins(0).storeDict(null).endCell()
  );
  console.log(`  Early Sub: ${earlySub.toString({bounceable: false})}`);

  // 5. Launch Fee
  console.log('[5/6] Launch Fee...');
  const launchFee = await deployOne(client, wallet, keyPair, launchFeeCode,
    beginCell().storeAddress(deployer).storeAddress(vcJetton).storeRef(walletCode)
      .storeAddress(vcJetton).storeDict(null).storeDict(null).endCell()
  );
  console.log(`  Launch Fee: ${launchFee.toString({bounceable: false})}`);

  // 6. Token Launcher
  console.log('[6/6] Token Launcher...');
  const tokenLauncher = await deployOne(client, wallet, keyPair, tokenLauncherCode,
    beginCell().storeRef(projectTokenCode).storeRef(walletCode).endCell()
  );
  console.log(`  Token Launcher: ${tokenLauncher.toString({bounceable: false})}`);

  console.log('\n✅ All 6 contracts deployed!\n');
  console.log(`VC_JETTON=${vcAddr}`);
  console.log(`FUND=${fund.toString({bounceable: false})}`);
  console.log(`STRATEGIC=${strategic.toString({bounceable: false})}`);
  console.log(`EARLY_SUB=${earlySub.toString({bounceable: false})}`);
  console.log(`LAUNCH_FEE=${launchFee.toString({bounceable: false})}`);
  console.log(`TOKEN_LAUNCHER=${tokenLauncher.toString({bounceable: false})}`);
}

main().catch(console.error);

// @ts-nocheck -- dev script using @ton/sandbox internal APIs not reflected in current types
import { WalletContractV4, internal, toNano, beginCell, Address, Cell } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { compile } from '@ton/blueprint';
import { Blockchain } from '@ton/sandbox';
import 'dotenv/config';

const MNEMONIC_RAW = process.env.DEPLOYER_MNEMONIC || '';
const MNEMONIC = MNEMONIC_RAW.replace(/"/g, '').replace(/\u00a0/g, ' ').trim();

function buildJettonContentCell(uri: string): Cell {
  return beginCell()
    .storeUint(1, 8)
    .storeBuffer(Buffer.from(uri, 'ascii'))
    .endCell();
}

async function main() {
  const keyPair = await mnemonicToPrivateKey(MNEMONIC.split(' '));
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });

  console.log('Wallet Address:', wallet.address.toString({ bounceable: false }));

  const blockchain = await Blockchain.create();
  const walletContract = blockchain.openContract(wallet);

  // Initialize wallet with seqno 2293
  const initialData = beginCell()
    .storeUint(2293, 32) // seqno
    .storeUint(698983191, 32) // subwallet
    .storeBuffer(keyPair.publicKey)
    .storeBit(0) // empty plugins dict
    .endCell();

  const smc = await blockchain.getContract(wallet.address);
  smc.balance = toNano('1000');
  smc.blockchain = blockchain;
  smc.account.state = {
    type: 'active',
    state: {
      code: wallet.init.code,
      data: initialData
    }
  };

  const vcJettonCode = await compile('VcJetton');
  const walletCode = await compile('ProjectTokenWallet');
  const metadataUri = 'https://ivory-keen-perch-796.mypinata.cloud/ipfs/bafkreifs5odqmuqrz5pwfx73sfxqq6r6gnpfqlpepny2mmqdxhhscwvuwi';
  const contentCell = buildJettonContentCell(metadataUri);
  const dataCell = beginCell()
    .storeCoins(0)
    .storeAddress(wallet.address)
    .storeRef(contentCell)
    .storeRef(walletCode)
    .endCell();

  const stateInit = beginCell().storeUint(6, 5).storeRef(vcJettonCode).storeRef(dataCell).endCell();
  const vcJettonAddress = new Address(0, stateInit.hash());

  console.log('Simulating transfer...');
  const transfer = wallet.createTransfer({
    seqno: 2293,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: vcJettonAddress,
        value: toNano('0.15'),
        bounce: false,
        init: { code: vcJettonCode, data: dataCell },
        body: beginCell().endCell()
      })
    ]
  });

  const res = await blockchain.sendMessage(transfer);
  console.log('Transaction Results:');
  for (const event of res.events) {
    console.log('Event:', event.type);
  }

  for (const tx of res.transactions) {
    console.log(`Tx on ${tx.address.toString({ bounceable: false })}:`);
    console.log(`  Success: ${tx.description.type === 'generic' ? tx.description.computePhase.type === 'vm' && tx.description.computePhase.success : 'unknown'}`);
    if (tx.description.type === 'generic' && tx.description.computePhase.type === 'vm') {
      console.log(`  Exit Code: ${tx.description.computePhase.exitCode}`);
      console.log(`  Gas Used: ${tx.description.computePhase.gasUsed}`);
      if (tx.vmLogs) {
        console.log(`  VM Logs:`, tx.vmLogs);
      }
    }
  }
}

main().catch(console.error);

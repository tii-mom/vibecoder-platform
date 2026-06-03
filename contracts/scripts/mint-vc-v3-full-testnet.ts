import { Address, beginCell, toNano } from '@ton/core';
import { internal, TonClient, WalletContractV4 } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const DRY_RUN = !process.argv.includes('--execute');
const NETWORK = process.env.TON_NETWORK || 'testnet';
if (NETWORK === 'mainnet') throw new Error('Testnet only. Refusing TON_NETWORK=mainnet.');
if (NETWORK !== 'testnet') throw new Error('Set TON_NETWORK=testnet or leave it unset.');

if (!DRY_RUN && process.env.CONFIRM_TESTNET_FULL_V3_MINT !== 'YES') {
    throw new Error('Set CONFIRM_TESTNET_FULL_V3_MINT=YES before executing full v3 funding.');
}

const MNEMONIC = (process.env.DEPLOYER_MNEMONIC || '').replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
const HAS_MNEMONIC = MNEMONIC.split(' ').length >= 12;
if (!DRY_RUN && !HAS_MNEMONIC) throw new Error('Set DEPLOYER_MNEMONIC before executing.');

const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
const DEPLOYED_MANIFEST = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.full.json');
const PLAN_MANIFEST = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.full.plan.json');
const MANIFEST_PATH = existsSync(DEPLOYED_MANIFEST) ? DEPLOYED_MANIFEST : PLAN_MANIFEST;
if (!existsSync(MANIFEST_PATH)) throw new Error('Full v3 manifest not found.');

function endpoint(): string {
    const base = 'https://testnet.toncenter.com';
    return TONCENTER_KEY ? base + '/api/v2/jsonRPC?api_key=' + TONCENTER_KEY : base + '/api/v2/jsonRPC';
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const vcMaster = Address.parse(manifest.basePlatformContracts.VC_JETTON);

const targets = [
    ['DEVELOPER_REWARD_POOL', '100000000'],
    ['ECOSYSTEM_REWARD_POOL', '100000000'],
    ['DEVELOPMENT_FUND', '100000000'],
    ['RESERVE_VAULT', '100000000'],
] as const;

function mintBody(to: Address, amount: bigint, response: Address) {
    return beginCell()
        .storeUint(21, 32)
        .storeUint(0, 64)
        .storeAddress(to)
        .storeCoins(amount)
        .storeAddress(response)
        .storeCoins(0)
        .storeSlice(beginCell().endCell().beginParse())
        .endCell();
}

async function walletFor(client: TonClient, owner: Address): Promise<Address> {
    const result = await client.runMethod(vcMaster, 'get_wallet_address', [
        { type: 'slice', cell: beginCell().storeAddress(owner).endCell() },
    ]);
    return result.stack.readAddress();
}

async function main() {
    console.log('=== VC v3 Full Testnet Funding Plan ===');
    console.log('Mode: ' + (DRY_RUN ? 'DRY RUN' : 'EXECUTE'));
    console.log('Manifest: ' + MANIFEST_PATH);
    console.log();

    const client = new TonClient({ endpoint: endpoint() });
    const jettonData = await client.runMethod(vcMaster, 'get_jetton_data', []);
    jettonData.stack.readBigNumber();
    jettonData.stack.readBigNumber();
    const admin = jettonData.stack.readAddress();
    console.log('VC master: ' + vcMaster.toString({ bounceable: false }));
    console.log('VC admin: ' + admin.toString({ bounceable: false }));

    let wallet: any = null;
    let secretKey: Buffer | null = null;
    if (HAS_MNEMONIC) {
        const keyPair = await mnemonicToPrivateKey(MNEMONIC.split(' '));
        secretKey = keyPair.secretKey;
        wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
        console.log('Signer: ' + wallet.address.toString({ bounceable: false }));
        if (!wallet.address.equals(admin)) throw new Error('Signer is not VC_JETTON admin. Refusing to mint.');
    } else {
        console.log('Signer: not loaded in dry-run.');
    }
    console.log();

    for (const [label, amountVc] of targets) {
        const owner = Address.parse(manifest.v3Contracts[label]);
        const expectedWallet = Address.parse(manifest.selfVcWallets[label]);
        const computedWallet = await walletFor(client, owner);
        if (!computedWallet.equals(expectedWallet)) throw new Error(label + ': computed wallet does not match manifest.');
        console.log(label + ': owner=' + owner.toString({ bounceable: false }) + ' amount=' + amountVc + ' VC');
    }

    if (DRY_RUN) {
        console.log('\nDry-run complete. No transactions sent.');
        return;
    }

    for (const [label, amountVc] of targets) {
        const owner = Address.parse(manifest.v3Contracts[label]);
        const seqno = await wallet.getSeqno();
        await wallet.sendTransfer({
            seqno,
            secretKey,
            messages: [internal({
                to: vcMaster,
                value: toNano('0.12'),
                body: mintBody(owner, toNano(amountVc), wallet.address),
            })],
        });
        await new Promise(resolve => setTimeout(resolve, 15000));
        console.log(label + ': mint transaction submitted. Tx hash not captured by script.');
    }
}

main().catch(e => { console.error(e); process.exit(1); });

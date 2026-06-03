import { Address, beginCell, toNano } from '@ton/core';
import { internal, TonClient, WalletContractV4 } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const DRY_RUN = !process.argv.includes('--execute');
const NETWORK = process.env.TON_NETWORK || 'testnet';

if (NETWORK === 'mainnet') throw new Error('Testnet only.');

if (!DRY_RUN && process.env.CONFIRM_TESTNET_FUND !== 'YES') {
    throw new Error('Set CONFIRM_TESTNET_FUND=YES before executing.');
}

const MNEMONIC = (process.env.DEPLOYER_MNEMONIC || '').replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
const HAS_MNEMONIC = MNEMONIC.split(' ').length >= 12;
if (!DRY_RUN && !HAS_MNEMONIC) throw new Error('Set DEPLOYER_MNEMONIC.');

const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';

function endpoint(): string {
    const base = 'https://testnet.toncenter.com';
    return TONCENTER_KEY ? base + '/api/v2/jsonRPC?api_key=' + TONCENTER_KEY : base + '/api/v2/jsonRPC';
}

const MANIFEST = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.json');
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : null;
if (!manifest) throw new Error('testnet.vc-v3.json not found. Run deployment first.');

const VC_MASTER = Address.parse(manifest.basePlatformContracts.VC_JETTON);

const SALE_OWNER = Address.parse(manifest.v3Contracts.SALE_VESTING);
const TEAM_OWNER = Address.parse(manifest.v3Contracts.TEAM_VESTING);
const EXPECTED_SALE_WALLET = Address.parse(manifest.selfVcWallets.SALE_VESTING);
const EXPECTED_TEAM_WALLET = Address.parse(manifest.selfVcWallets.TEAM_VESTING);

const SALE_AMOUNT = toNano(process.env.VC_V3_FUND_SALE || '300000000');
const TEAM_AMOUNT = toNano(process.env.VC_V3_FUND_TEAM || '200000000');

async function getBalance(client: TonClient, owner: Address): Promise<bigint> {
    try {
        const result = await client.runMethod(VC_MASTER, 'get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(owner).endCell() }
        ]);
        const wallet = result.stack.readAddress();
        const walletResult = await client.runMethod(wallet, 'get_wallet_data', []);
        return walletResult.stack.readBigNumber();
    } catch {
        return 0n;
    }
}

async function sendVc(
    client: TonClient, wallet: any, secretKey: Buffer,
    owner: Address, expectedWallet: Address, amount: bigint, label: string
): Promise<boolean> {
    const targetWallet = await client.runMethod(VC_MASTER, 'get_wallet_address', [
        { type: 'slice', cell: beginCell().storeAddress(owner).endCell() }
    ]);
    const computedWallet = targetWallet.stack.readAddress();

    const match = computedWallet.equals(expectedWallet);
    console.log(label + ':');
    console.log('  owner: ' + owner.toString({ bounceable: false }));
    console.log('  expected wallet: ' + expectedWallet.toString({ bounceable: false }));
    console.log('  computed wallet: ' + computedWallet.toString({ bounceable: false }));
    console.log('  ' + (match ? 'MATCH OK' : 'MISMATCH FAIL'));
    console.log('  amount: ' + Number(amount) / 1e9 + ' VC');

    if (!match) throw new Error(label + ': computed wallet does not match expected. Aborting.');

    if (DRY_RUN) return true;

    try {
        const fromVcWallet = await client.runMethod(VC_MASTER, 'get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(wallet.address).endCell() }
        ]);
        const fromWallet = fromVcWallet.stack.readAddress();

        const seqno = await wallet.getSeqno();
        const body = beginCell()
            .storeUint(0x0f8a7ea5, 32).storeUint(0, 64).storeCoins(amount)
            .storeAddress(owner).storeAddress(wallet.address)
            .storeMaybeRef(null).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell();
        await wallet.sendTransfer({
            seqno, secretKey,
            messages: [internal({ to: fromWallet, value: toNano('0.15'), body })],
        });
        await new Promise(r => setTimeout(r, 15000));
        return true;
    } catch (e: any) {
        console.error('FAIL ' + label + ': ' + String(e.message || e));
        return false;
    }
}

async function main() {
    console.log('=== VC v3 Testnet Wallet Funding ===');
    console.log('Mode: ' + (DRY_RUN ? 'DRY RUN' : 'EXECUTE'));
    console.log();

    const keyPair = HAS_MNEMONIC ? await mnemonicToPrivateKey(MNEMONIC.split(' '))
        : { publicKey: Buffer.alloc(32), secretKey: Buffer.alloc(64) };
    const client = new TonClient({ endpoint: endpoint() });
    const wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));

    const deployerBalance = await getBalance(client, wallet.address);
    console.log('Deployer VC balance: ' + Number(deployerBalance) / 1e9 + ' VC');
    console.log();

    let ok = true;
    ok = await sendVc(client, wallet, keyPair.secretKey, SALE_OWNER, EXPECTED_SALE_WALLET, SALE_AMOUNT, 'SaleVesting') && ok;
    ok = await sendVc(client, wallet, keyPair.secretKey, TEAM_OWNER, EXPECTED_TEAM_WALLET, TEAM_AMOUNT, 'TeamVesting') && ok;

    if (DRY_RUN) {
        console.log('=== Dry-run complete. No transactions sent. ===');
        console.log('Run with: CONFIRM_TESTNET_FUND=YES npm run fund:vc-v3:testnet');
        return;
    }

    if (!ok) {
        console.error('Partial funding. Check errors above.');
        process.exit(1);
    }

    const saleAfter = await getBalance(client, SALE_OWNER);
    const teamAfter = await getBalance(client, TEAM_OWNER);
    console.log('\nSaleVesting wallet: ' + Number(saleAfter) / 1e9 + ' VC');
    console.log('TeamVesting wallet: ' + Number(teamAfter) / 1e9 + ' VC');
    console.log('Funding complete.');
}

main().catch(e => { console.error(e); process.exit(1); });

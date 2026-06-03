import { Address, beginCell, toNano } from '@ton/core';
import { TonClient } from '@ton/ton';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const NETWORK = process.env.TON_NETWORK || 'testnet';
if (NETWORK === 'mainnet') throw new Error('Testnet only. Refusing TON_NETWORK=mainnet.');
if (NETWORK !== 'testnet') throw new Error('Set TON_NETWORK=testnet or leave it unset.');

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
const allowPending = manifest.status === 'planned';
let failed = false;
let pending = 0;

const targets = [
    ['SALE_VESTING', '300000000'],
    ['TEAM_VESTING', '200000000'],
    ['DEVELOPER_REWARD_POOL', '100000000'],
    ['ECOSYSTEM_REWARD_POOL', '100000000'],
    ['DEVELOPMENT_FUND', '100000000'],
    ['RESERVE_VAULT', '100000000'],
] as const;

async function check(client: TonClient, label: string, minVc: string) {
    const ownerAddr = manifest.v3Contracts?.[label];
    const expectedWalletAddr = manifest.selfVcWallets?.[label];
    if (!ownerAddr || !expectedWalletAddr) {
        console.log('FAIL ' + label + ': missing owner or self VC wallet in manifest');
        failed = true;
        return;
    }

    const owner = Address.parse(ownerAddr);
    const expectedWallet = Address.parse(expectedWalletAddr);
    let wallet: Address;

    try {
        const r = await client.runMethod(vcMaster, 'get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(owner).endCell() },
        ]);
        wallet = r.stack.readAddress();
    } catch (e: any) {
        console.log('FAIL ' + label + ': unable to derive wallet address (' + String(e.message || e) + ')');
        failed = true;
        return;
    }

    if (!wallet.equals(expectedWallet)) {
        console.log('FAIL ' + label + ': derived wallet does not match manifest wallet');
        failed = true;
        return;
    }

    const minNano = toNano(minVc);
    try {
        const wr = await client.runMethod(wallet, 'get_wallet_data', []);
        const balance = wr.stack.readBigNumber();
        const ok = balance >= minNano;
        console.log((ok ? 'OK ' : 'FAIL ') + label + ': balance=' + Number(balance) / 1e9 + ' VC (min ' + minVc + ' VC)');
        if (!ok) failed = true;
    } catch (e: any) {
        if (allowPending) {
            pending += 1;
            console.log('PENDING ' + label + ': wallet not initialized at ' + expectedWallet.toString({ bounceable: false }));
        } else {
            console.log('FAIL ' + label + ': wallet not initialized at ' + expectedWallet.toString({ bounceable: false }) + ' (' + String(e.message || e) + ')');
            failed = true;
        }
    }
}

async function main() {
    console.log('=== VC v3 Full Balance Verification ===');
    console.log('Manifest: ' + MANIFEST_PATH);
    console.log('Status: ' + manifest.status);
    console.log();

    const client = new TonClient({ endpoint: endpoint() });
    for (const [label, minVc] of targets) {
        await check(client, label, minVc);
    }

    if (pending > 0) console.log('PENDING: ' + pending + ' wallet(s) require funding or deployment.');
    if (failed) process.exit(1);
    console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });

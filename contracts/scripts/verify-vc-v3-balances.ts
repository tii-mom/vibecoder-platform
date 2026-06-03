import { Address, beginCell } from '@ton/core';
import { TonClient } from '@ton/ton';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const NETWORK = process.env.TON_NETWORK || 'testnet';
if (NETWORK === 'mainnet') throw new Error('Testnet only.');
const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';

function endpoint(): string {
    const base = NETWORK === 'mainnet' ? 'https://toncenter.com' : 'https://testnet.toncenter.com';
    return TONCENTER_KEY ? base + '/api/v2/jsonRPC?api_key=' + TONCENTER_KEY : base + '/api/v2/jsonRPC';
}

const MANIFEST_PATH = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.json');
if (!existsSync(MANIFEST_PATH)) throw new Error('testnet.vc-v3.json not found');

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const vcMaster = Address.parse(manifest.basePlatformContracts.VC_JETTON);

let failed = false;

async function check(client: TonClient, label: string, ownerAddr: string, minNano: bigint) {
    const owner = Address.parse(ownerAddr);
    let balance = 0n;
    try {
        const r = await client.runMethod(vcMaster, 'get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(owner).endCell() }
        ]);
        const wallet = r.stack.readAddress();
        const wr = await client.runMethod(wallet, 'get_wallet_data', []);
        balance = wr.stack.readBigNumber();
    } catch {
        balance = 0n;
    }
    const ok = balance >= minNano;
    console.log((ok ? 'OK ' : 'FAIL ') + label + ': balance=' + Number(balance)/1e9 + ' VC (min ' + Number(minNano)/1e9 + ' VC)');
    if (!ok) failed = true;
}

async function main() {
    const client = new TonClient({ endpoint: endpoint() });
    await check(client, 'SALE_VESTING', manifest.selfVcWallets.SALE_VESTING, BigInt('300000000000000000'));
    await check(client, 'TEAM_VESTING', manifest.selfVcWallets.TEAM_VESTING, BigInt('200000000000000000'));
    if (failed) process.exit(1);
    console.log('All balances sufficient.');
}

main().catch(e => { console.error(e); process.exit(1); });

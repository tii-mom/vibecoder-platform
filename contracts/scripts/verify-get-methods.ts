import { Address, beginCell } from '@ton/core';
import { TonClient } from '@ton/ton';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const NETWORK = process.env.TON_NETWORK || 'testnet';
const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
const MANIFEST = process.env.DEPLOYMENT_MANIFEST || resolve(process.cwd(), 'deployments', `${NETWORK}.platform.json`);

if (NETWORK === 'mainnet' && process.env.ALLOW_MAINNET_VERIFY !== '1') {
    throw new Error('Refusing mainnet verification unless ALLOW_MAINNET_VERIFY=1 is set.');
}

function endpoint() {
    const base = NETWORK === 'mainnet' ? 'https://toncenter.com' : 'https://testnet.toncenter.com';
    return TONCENTER_KEY ? `${base}/api/v2/jsonRPC?api_key=${TONCENTER_KEY}` : `${base}/api/v2/jsonRPC`;
}

function readAddress(name: string, manifest: any): Address | null {
    const fromEnv = process.env[`${name}_ADDRESS`] || process.env[name];
    const raw = fromEnv || manifest?.contracts?.[name]?.address;
    return raw ? Address.parse(raw) : null;
}

async function verify(client: TonClient, label: string, address: Address | null, methods: string[]) {
    if (!address) {
        console.log(`SKIP ${label}: no address`);
        return;
    }

    for (const method of methods) {
        await client.runMethod(address, method, []);
        console.log(`OK ${label}.${method} ${address.toString({ bounceable: false })}`);
    }
}

async function verifyVcJetton(client: TonClient, address: Address | null, owner: Address) {
    if (!address) {
        console.log('SKIP VC_JETTON: no address');
        return;
    }

    await client.runMethod(address, 'get_jetton_data', []);
    console.log(`OK VC_JETTON.get_jetton_data ${address.toString({ bounceable: false })}`);

    await client.runMethod(address, 'get_wallet_address', [
        { type: 'slice', cell: beginCell().storeAddress(owner).endCell() },
    ]);
    console.log(`OK VC_JETTON.get_wallet_address ${address.toString({ bounceable: false })}`);
}

async function main() {
    const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
    const client = new TonClient({ endpoint: endpoint() });
    const vcOwner = Address.parse(
        process.env.VC_BALANCE_OWNER
        || manifest?.recipients?.earlyOps
        || (() => { throw new Error('Set VC_BALANCE_OWNER or provide recipients.earlyOps in deployment manifest.'); })()
    );

    await verifyVcJetton(client, readAddress('VC_JETTON', manifest), vcOwner);
    await verify(client, 'FUND', readAddress('FUND', manifest), ['getFundData', 'getFundStats', 'getFundUnlockState']);
    await verify(client, 'VC_REWARD_POOL', readAddress('VC_REWARD_POOL', manifest), ['getRewardPoolData']);
    await verify(client, 'EARLY_FUNDRAISING', readAddress('EARLY_FUNDRAISING', manifest), ['getFundraisingData']);
    await verify(client, 'LAUNCH_FEE', readAddress('LAUNCH_FEE', manifest), ['getLaunchFeeData']);
    await verify(client, 'TOKEN_LAUNCHER', readAddress('TOKEN_LAUNCHER', manifest), ['getLauncherData']);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

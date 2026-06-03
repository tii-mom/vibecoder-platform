import { Address } from '@ton/core';
import { TonClient } from '@ton/ton';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const NETWORK = process.env.TON_NETWORK || 'testnet';
if (NETWORK === 'mainnet') throw new Error('Testnet only. Refusing TON_NETWORK=mainnet.');
if (NETWORK !== 'testnet') throw new Error('Set TON_NETWORK=testnet or leave it unset.');

const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
const DEPLOYED_MANIFEST = resolve(process.cwd(), 'deployments', 'testnet.simple-launch.json');
const PLAN_MANIFEST = resolve(process.cwd(), 'deployments', 'testnet.simple-launch.plan.json');
const MANIFEST_PATH = existsSync(DEPLOYED_MANIFEST) ? DEPLOYED_MANIFEST : PLAN_MANIFEST;

if (!existsSync(MANIFEST_PATH)) {
    throw new Error('SimpleLaunch manifest not found. Run deploy:simple-launch:testnet:plan first.');
}

function endpoint(): string {
    const base = 'https://testnet.toncenter.com';
    return TONCENTER_KEY ? base + '/api/v2/jsonRPC?api_key=' + TONCENTER_KEY : base + '/api/v2/jsonRPC';
}

let failedCount = 0;
let pendingCount = 0;

async function verify(
    client: TonClient,
    label: string,
    address: string | null | undefined,
    methods: Array<{ name: string; args?: any[] }>,
    allowPending: boolean,
) {
    if (!address) {
        console.log('PENDING ' + label + ': not in manifest');
        if (allowPending) pendingCount += 1;
        else failedCount += 1;
        return;
    }

    const addr = Address.parse(address);
    for (const method of methods) {
        try {
            await client.runMethod(addr, method.name, method.args || []);
            console.log('OK ' + label + '.' + method.name + ' ' + addr.toString({ bounceable: false }));
        } catch (e: any) {
            const message = String(e.message || e).slice(0, 120);
            if (allowPending) {
                pendingCount += 1;
                console.log('PENDING ' + label + '.' + method.name + ': not deployed yet (' + message + ')');
            } else {
                failedCount += 1;
                console.log('FAIL ' + label + '.' + method.name + ': ' + message);
            }
        }
    }
}

async function main() {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    const client = new TonClient({ endpoint: endpoint() });
    const allowPending = manifest.status === 'planned';

    console.log('=== SimpleLaunch Testnet Get-Method Verification ===');
    console.log('Network: testnet');
    console.log('Manifest: ' + MANIFEST_PATH);
    console.log('Status: ' + manifest.status);
    console.log();

    await verify(client, 'SIMPLE_LAUNCH_CAMPAIGN', manifest.contracts?.SIMPLE_LAUNCH_CAMPAIGN, [
        { name: 'getSimpleLaunchCampaignData' },
        { name: 'getSimpleLaunchDistribution' },
        { name: 'getSimpleLaunchTokenState' },
    ], allowPending);

    await verify(client, 'LAUNCH_ESCROW', manifest.contracts?.LAUNCH_ESCROW, [
        { name: 'getLaunchEscrowData' },
    ], allowPending);

    if (manifest.flow?.activation === 'complete') {
        await verify(client, 'PROJECT_TOKEN', manifest.contracts?.PROJECT_TOKEN, [
            { name: 'get_jetton_data' },
        ], false);
    } else {
        console.log('PENDING PROJECT_TOKEN.get_jetton_data: activation not marked complete in manifest');
        pendingCount += 1;
    }

    console.log();
    if (failedCount > 0) {
        console.log('FAILED: ' + failedCount + ' get-method check(s) failed.');
        process.exit(1);
    }
    if (pendingCount > 0) {
        console.log('PENDING: ' + pendingCount + ' get-method check(s) require deployment or flow execution.');
    }
    console.log('Done.');
}

main().catch(e => {
    console.error('SimpleLaunch verification failed: ' + String(e.message || e));
    process.exit(1);
});

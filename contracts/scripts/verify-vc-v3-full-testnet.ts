import { Address } from '@ton/core';
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

if (!existsSync(MANIFEST_PATH)) throw new Error('Full v3 manifest not found. Run deploy:vc-v3:full:testnet:plan first.');

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
    methods: string[],
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
            await client.runMethod(addr, method, []);
            console.log('OK ' + label + '.' + method + ' ' + addr.toString({ bounceable: false }));
        } catch (e: any) {
            if (allowPending) {
                pendingCount += 1;
                console.log('PENDING ' + label + '.' + method + ': not deployed yet (' + String(e.message || e).slice(0, 80) + ')');
            } else {
                failedCount += 1;
                console.log('FAIL ' + label + '.' + method + ': ' + String(e.message || e).slice(0, 120));
            }
        }
    }
}

async function main() {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    const client = new TonClient({ endpoint: endpoint() });

    console.log('=== VC v3 Full Get-Method Verification ===');
    console.log('Network: testnet');
    console.log('Manifest: ' + MANIFEST_PATH);
    console.log('Status: ' + manifest.status);
    console.log();

    const allowPending = manifest.status === 'planned';

    await verify(client, 'SALE_VESTING', manifest.v3Contracts?.SALE_VESTING, ['getSaleVestingData', 'getSaleUnlockState'], false);
    await verify(client, 'TEAM_VESTING', manifest.v3Contracts?.TEAM_VESTING, ['getTeamVestingData', 'getTeamClaimable'], false);
    await verify(client, 'DEVELOPER_REWARD_POOL', manifest.v3Contracts?.DEVELOPER_REWARD_POOL, ['getDeveloperPoolData'], allowPending);
    await verify(client, 'ECOSYSTEM_REWARD_POOL', manifest.v3Contracts?.ECOSYSTEM_REWARD_POOL, ['getEcosystemPoolData', 'getEcosystemUnlockState'], allowPending);
    await verify(client, 'DEVELOPMENT_FUND', manifest.v3Contracts?.DEVELOPMENT_FUND, ['getDevelopmentFundData'], allowPending);
    await verify(client, 'RESERVE_VAULT', manifest.v3Contracts?.RESERVE_VAULT, ['getReserveVaultData'], allowPending);

    console.log();
    if (failedCount > 0) {
        console.log('FAILED: ' + failedCount + ' get-method check(s) failed.');
        process.exit(1);
    }
    if (pendingCount > 0) {
        console.log('PENDING: ' + pendingCount + ' get-method check(s) require testnet deployment.');
    }
    console.log('Done.');
}

main().catch(e => {
    console.error('Verification failed: ' + String(e.message || e));
    process.exit(1);
});

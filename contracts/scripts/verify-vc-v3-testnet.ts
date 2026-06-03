import { Address, beginCell } from '@ton/core';
import { TonClient } from '@ton/ton';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const NETWORK = process.env.TON_NETWORK || 'testnet';
const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
const DEPLOYED_MANIFEST = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.json');
const PLAN_MANIFEST = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.plan.json');
const MANIFEST = existsSync(DEPLOYED_MANIFEST) ? DEPLOYED_MANIFEST : PLAN_MANIFEST;

let failedCount = 0;

if (NETWORK === 'mainnet' && process.env.ALLOW_MAINNET_VERIFY !== '1') {
    throw new Error('Refusing mainnet verification unless ALLOW_MAINNET_VERIFY=1 is set.');
}

function endpoint(): string {
    const base = NETWORK === 'mainnet' ? 'https://toncenter.com' : 'https://testnet.toncenter.com';
    return TONCENTER_KEY ? base + '/api/v2/jsonRPC?api_key=' + TONCENTER_KEY : base + '/api/v2/jsonRPC';
}

async function verify(
    client: TonClient,
    label: string,
    address: string | null | undefined,
    methods: [string, ...string[]][]
): Promise<void> {
    if (!address) {
        console.log('PENDING ' + label + ': not yet deployed');
        return;
    }
    const addr = Address.parse(address);
    for (const [method, ...args] of methods) {
        try {
            const stackArgs = args.map(a => {
                if (a.startsWith('addr:')) {
                    return {
                        type: 'slice' as const,
                        cell: beginCell().storeAddress(Address.parse(a.slice(5))).endCell(),
                    };
                }
                return { type: 'int' as const, value: BigInt(a) };
            });
            await client.runMethod(addr, method, stackArgs);
            console.log('OK ' + label + '.' + method + ' ' + addr.toString({ bounceable: false }));
        } catch (e: any) {
            failedCount += 1;
            console.log('FAIL ' + label + '.' + method + ': ' + String(e.message || e).slice(0, 120));
        }
    }
}

async function main() {
    const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
    const client = new TonClient({ endpoint: endpoint() });

    const saleAddr: string | null = manifest?.v3Contracts?.SALE_VESTING || null;
    const teamAddr: string | null = manifest?.v3Contracts?.TEAM_VESTING || null;

    console.log('=== VC v3 Get-Method Verification ===');
    console.log('Network: ' + NETWORK);
    console.log();

    await verify(client, 'SALE_VESTING', saleAddr, [
        ['getSaleVestingData'],
        ['getSaleTier', '1'],
        ['getSaleTier', '2'],
        ['getSaleTier', '3'],
        ['getSaleUnlockState'],
    ]);

    await verify(client, 'TEAM_VESTING', teamAddr, [
        ['getTeamVestingData'],
        ['getTeamVestingRound', '1'],
        ['getTeamVestingRound', '2'],
        ['getTeamVestingRound', '10'],
        ['getTeamClaimable'],
    ]);

    if (!saleAddr && !teamAddr) {
        console.log();
        console.log('All v3 contracts pending deployment.');
        console.log('Run deploy-vc-v3-testnet.ts first, then update manifest addresses.');
    }

    console.log();
    if (failedCount > 0) {
        console.log('FAILED: ' + failedCount + ' get-method(s) failed.');
        process.exit(1);
    }
    console.log('Done.');
}

main().catch(e => {
    console.error('Verification failed: ' + (e.message || e));
    process.exit(1);
});

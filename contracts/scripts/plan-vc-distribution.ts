import { Address } from '@ton/core';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const MANIFEST = process.env.DEPLOYMENT_MANIFEST || process.argv.find((arg) => arg.startsWith('--manifest='))?.slice('--manifest='.length)
    || resolve(process.cwd(), 'deployments', 'mainnet.platform.dry-run.json');
const OUT = process.env.VC_DISTRIBUTION_PLAN || resolve(process.cwd(), 'deployments', 'mainnet.vc-distribution.dry-run.json');
const CHECK_ONLY = process.argv.includes('--check');

function vc(amount: bigint) {
    return amount * 1_000_000_000n;
}

function readAddress(name: string, fallback?: string) {
    const raw = process.env[name] || fallback;
    if (!raw) throw new Error(`Missing address for ${name}`);
    return Address.parse(raw).toString({ bounceable: false });
}

function main() {
    if (!existsSync(MANIFEST)) throw new Error(`Missing manifest: ${MANIFEST}`);
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    if (manifest.network !== 'mainnet' || manifest.dryRun !== true) {
        throw new Error('Distribution dry-run requires a mainnet dry-run platform manifest.');
    }

    const rewardPool = readAddress('VC_REWARD_POOL_ADDRESS', manifest.contracts?.VC_REWARD_POOL?.address);
    const plan = [
        { name: 'Developer Incentives', to: rewardPool, amountVc: '100000000', amountNano: vc(100_000_000n).toString() },
        { name: 'Platform Fund', to: readAddress('VC_FUND_ADDRESS', manifest.contracts?.FUND?.address), amountVc: '250000000', amountNano: vc(250_000_000n).toString() },
        { name: 'Ecosystem Incentives', to: rewardPool, amountVc: '350000000', amountNano: vc(350_000_000n).toString() },
        { name: 'Team Lockup', to: readAddress('VC_TEAM_LOCKUP_ADDRESS'), amountVc: '100000000', amountNano: vc(100_000_000n).toString() },
        { name: 'Liquidity Pool', to: readAddress('VC_LIQUIDITY_ADDRESS', manifest.recipients?.liquidity), amountVc: '50000000', amountNano: vc(50_000_000n).toString() },
        { name: 'Early Fundraising', to: readAddress('VC_EARLY_FUNDRAISING_ADDRESS', manifest.contracts?.EARLY_FUNDRAISING?.address), amountVc: '100000000', amountNano: vc(100_000_000n).toString() },
        { name: 'Early Operations and Support', to: readAddress('VC_EARLY_OPS_ADDRESS', manifest.recipients?.earlyOps), amountVc: '30000000', amountNano: vc(30_000_000n).toString() },
    ];

    const totalNano = plan.reduce((sum, item) => sum + BigInt(item.amountNano), 0n);
    if (totalNano !== vc(980_000_000n)) {
        throw new Error(`Distribution total mismatch: ${totalNano}`);
    }

    const output = {
        network: 'mainnet',
        dryRun: true,
        generatedAt: new Date().toISOString(),
        adminPolicy: manifest.adminPolicy,
        vcJetton: readAddress('VC_JETTON_ADDRESS', manifest.contracts?.VC_JETTON?.address),
        totalVc: '980000000',
        totalNano: totalNano.toString(),
        distributions: plan,
        adminRevocationPlanned: false,
    };

    if (!CHECK_ONLY) {
        writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);
        console.log(`VC distribution dry-run: ${OUT}`);
    }
    console.log(JSON.stringify({ totalVc: output.totalVc, entries: output.distributions.length, adminRevocationPlanned: false }, null, 2));
}

try {
    main();
} catch (error) {
    console.error(error);
    process.exit(1);
}

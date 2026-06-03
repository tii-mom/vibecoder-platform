import { Address } from '@ton/core';
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const DRY_RUN = !process.argv.includes('--execute');
const NETWORK = process.env.TON_NETWORK || 'testnet';

if (NETWORK === 'mainnet') {
    throw new Error('This script is testnet only. Refusing TON_NETWORK=mainnet.');
}

if (!DRY_RUN && process.env.CONFIRM_TESTNET_DEPLOY !== 'YES') {
    throw new Error('Set CONFIRM_TESTNET_DEPLOY=YES before executing testnet deployment.');
}

const VC_JETTON_ADDRESS = process.env.VC_JETTON_ADDRESS || '';
const VC_TREASURY_ADDRESS = process.env.VC_TREASURY_ADDRESS || '';
const VC_TEAM_BENEFICIARY = process.env.VC_TEAM_BENEFICIARY_ADDRESS || '';
const VC_ADMIN_ADDRESS = process.env.VC_ADMIN_ADDRESS || '';

function loadCode(name: string): void {
    const artifactPath = resolve(process.cwd(), 'build', name + '.json');
    if (!existsSync(artifactPath)) {
        execFileSync('acton', ['build', name], { cwd: resolve(process.cwd()), stdio: 'inherit' });
    }
}

function main() {
    console.log('=== VC v3 Testnet Deployment Plan ===');
    console.log('Mode: ' + (DRY_RUN ? 'DRY RUN' : 'EXECUTE'));
    console.log('Network: ' + NETWORK);
    console.log();

    const missing: string[] = [];
    if (!VC_JETTON_ADDRESS) missing.push('VC_JETTON_ADDRESS');
    if (!VC_TREASURY_ADDRESS) missing.push('VC_TREASURY_ADDRESS');
    if (!VC_TEAM_BENEFICIARY) missing.push('VC_TEAM_BENEFICIARY_ADDRESS');
    if (!VC_ADMIN_ADDRESS) missing.push('VC_ADMIN_ADDRESS');

    if (missing.length > 0) {
        console.log('MISSING ENV VARS: ' + missing.join(', '));
        console.log('Set these in .env before running with --execute.');
        if (DRY_RUN) {
            console.log('Continuing in dry-run mode with placeholder addresses.');
        } else {
            throw new Error('Missing required environment variables.');
        }
    }

    let vcMaster: Address | null = null;
    let treasury: Address | null = null;
    let teamBeneficiary: Address | null = null;
    let admin: Address | null = null;

    if (VC_JETTON_ADDRESS) vcMaster = Address.parse(VC_JETTON_ADDRESS);
    if (VC_TREASURY_ADDRESS) treasury = Address.parse(VC_TREASURY_ADDRESS);
    if (VC_TEAM_BENEFICIARY) teamBeneficiary = Address.parse(VC_TEAM_BENEFICIARY);
    if (VC_ADMIN_ADDRESS) admin = Address.parse(VC_ADMIN_ADDRESS);

    loadCode('sale_vesting');
    loadCode('team_vesting');
    loadCode('project_token_wallet');

    console.log('--- SaleVesting ---');
    console.log('  admin: ' + (admin ? admin.toString({ bounceable: false }) : '(missing)'));
    console.log('  vcMaster: ' + (vcMaster ? vcMaster.toString({ bounceable: false }) : '(missing)'));
    console.log('  treasury: ' + (treasury ? treasury.toString({ bounceable: false }) : '(missing)'));
    console.log('  saleCap: 300,000,000 VC');
    console.log('  tiers: A=99TON/80kVC, B=299TON/250kVC, C=599TON/599kVC');
    console.log('  self VC wallet: computed from getMyAddress() at deploy');
    console.log();

    console.log('--- TeamVesting ---');
    console.log('  admin: ' + (admin ? admin.toString({ bounceable: false }) : '(missing)'));
    console.log('  vcMaster: ' + (vcMaster ? vcMaster.toString({ bounceable: false }) : '(missing)'));
    console.log('  beneficiary: ' + (teamBeneficiary ? teamBeneficiary.toString({ bounceable: false }) : '(missing)'));
    console.log('  totalAllocation: 200,000,000 VC');
    console.log('  rounds: 10 x 20,000,000 VC');
    console.log('  self VC wallet: computed from getMyAddress() at deploy');
    console.log();

    if (DRY_RUN) {
        console.log('=== Dry-run complete. No transactions sent. ===');
        console.log('Next steps:');
        console.log('1. Set all required env vars in .env');
        console.log('2. Fund deployer wallet with TON for gas');
        console.log('3. Review predicted parameters above');
        console.log('4. Run with: CONFIRM_TESTNET_DEPLOY=YES npm run deploy:vc-v3:testnet');
        console.log('5. After deploy, fill addresses in testnet.vc-v3.plan.json');
        console.log('6. Fund SaleVesting and TeamVesting VC wallets');
        console.log('7. Run: npm run verify:vc-v3:testnet');
    } else {
        const hasKey = !!process.env.TONCENTER_API_KEY;
        const hasMnemonic = !!(process.env.DEPLOYER_MNEMONIC || '');
        console.log('TONCENTER_API_KEY: ' + (hasKey ? 'present' : 'missing'));
        console.log('Deployer mnemonic: ' + (hasMnemonic ? 'present' : 'MISSING'));
        console.log('Execution requires manual confirmation.');
        console.log('NOT IMPLEMENTED: automatic on-chain deployment.');
    }
}

main();

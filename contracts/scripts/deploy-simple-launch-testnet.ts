import { mnemonicToPrivateKey } from '@ton/crypto';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import { internal, TonClient, WalletContractV4 } from '@ton/ton';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

import { LaunchEscrow } from '../wrappers/LaunchEscrow';
import { ProjectToken } from '../wrappers/ProjectToken';
import { SimpleLaunchCampaign } from '../wrappers/SimpleLaunchCampaign';

const DRY_RUN = !process.argv.includes('--execute');
const NETWORK = process.env.TON_NETWORK || 'testnet';

if (NETWORK === 'mainnet') throw new Error('Testnet only. Refusing TON_NETWORK=mainnet.');
if (NETWORK !== 'testnet') throw new Error('Set TON_NETWORK=testnet or leave it unset.');
if (!DRY_RUN && process.env.CONFIRM_SIMPLE_LAUNCH_TESTNET_DEPLOY !== 'YES') {
    throw new Error('Set CONFIRM_SIMPLE_LAUNCH_TESTNET_DEPLOY=YES before executing SimpleLaunch testnet deployment.');
}

const MNEMONIC = (process.env.DEPLOYER_MNEMONIC || '').replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
const HAS_MNEMONIC = MNEMONIC.split(' ').length >= 12;
if (!DRY_RUN && !HAS_MNEMONIC) throw new Error('Set DEPLOYER_MNEMONIC before executing.');

const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
const PLAN_MANIFEST_PATH = resolve(process.cwd(), 'deployments', 'testnet.simple-launch.plan.json');
const DEPLOYED_MANIFEST_PATH = resolve(process.cwd(), 'deployments', 'testnet.simple-launch.json');
const OVERRIDE_MANIFEST_PATH = process.env.SIMPLE_LAUNCH_MANIFEST_PATH
    ? resolve(process.cwd(), process.env.SIMPLE_LAUNCH_MANIFEST_PATH)
    : '';
const ZERO_ADDRESS = Address.parseRaw('0:' + '0'.repeat(64));

function endpoint(): string {
    const base = 'https://testnet.toncenter.com';
    return TONCENTER_KEY ? base + '/api/v2/jsonRPC?api_key=' + TONCENTER_KEY : base + '/api/v2/jsonRPC';
}

function envAddress(name: string, fallback: Address): Address {
    const raw = process.env[name];
    return raw ? Address.parse(raw) : fallback;
}

function envCoins(name: string, fallbackTon: string): bigint {
    return toNano(process.env[name] || fallbackTon);
}

function envNumber(name: string, fallback: number): number {
    const raw = process.env[name];
    return raw ? Number(raw) : fallback;
}

function loadCode(name: string): Cell {
    const artifactPath = resolve(process.cwd(), 'build', name + '.json');
    if (!existsSync(artifactPath)) {
        execFileSync('acton', ['build', name], { cwd: resolve(process.cwd()), stdio: 'inherit' });
    }
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as { code_boc64: string };
    return Cell.fromBoc(Buffer.from(artifact.code_boc64, 'base64'))[0];
}

async function sendOne(
    wallet: any,
    secretKey: Buffer,
    to: Address,
    value: bigint,
    body: Cell,
    init?: { code: Cell; data: Cell },
) {
    let seqno = 0;
    try {
        seqno = await wallet.getSeqno();
    } catch {
        seqno = 0;
    }
    await wallet.sendTransfer({
        seqno,
        secretKey,
        messages: [internal({ to, value, body, init })],
    });
    await new Promise(resolve => setTimeout(resolve, 12000));
}

async function main() {
    execFileSync('acton', ['build'], { cwd: resolve(process.cwd()), stdio: 'inherit' });

    let deployerAddress = ZERO_ADDRESS;
    let wallet: any = null;
    let secretKey: Buffer | null = null;

    if (HAS_MNEMONIC) {
        const keyPair = await mnemonicToPrivateKey(MNEMONIC.split(' '));
        secretKey = keyPair.secretKey;
        const client = new TonClient({ endpoint: endpoint() });
        wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
        deployerAddress = wallet.address;
    }

    const projectOwner = envAddress('SIMPLE_LAUNCH_PROJECT_OWNER', deployerAddress);
    const teamWallet = envAddress('SIMPLE_LAUNCH_TEAM_WALLET', projectOwner);
    const platformFund = envAddress('SIMPLE_LAUNCH_PLATFORM_FUND', projectOwner);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const endTime = envNumber('SIMPLE_LAUNCH_END_TIME', nowSeconds + 7 * 24 * 60 * 60);

    const campaignCode = loadCode('simple_launch_campaign');
    const escrowCode = loadCode('launch_escrow');
    const tokenCode = loadCode('project_token');
    const walletCode = loadCode('project_token_wallet');
    const metadata = beginCell()
        .storeUint(0, 8)
        .storeBuffer(Buffer.from(process.env.SIMPLE_LAUNCH_METADATA || 'simple-launch-testnet-v1'))
        .endCell();

    const campaignWithPlaceholder = SimpleLaunchCampaign.createFromConfig({
        projectOwner,
        teamWallet,
        platformFund,
        escrowAddress: ZERO_ADDRESS,
        tokenAddress: ZERO_ADDRESS,
        targetRaiseTon: envCoins('SIMPLE_LAUNCH_TARGET_TON', '50'),
        hardCapTon: envCoins('SIMPLE_LAUNCH_HARD_CAP_TON', '50'),
        minContributionTon: envCoins('SIMPLE_LAUNCH_MIN_CONTRIBUTION_TON', '1'),
        minParticipants: envNumber('SIMPLE_LAUNCH_MIN_PARTICIPANTS', 5),
        minTotalRaiseTon: envCoins('SIMPLE_LAUNCH_MIN_TOTAL_RAISE_TON', '5'),
        endTime,
        platformFeeBps: envNumber('SIMPLE_LAUNCH_PLATFORM_FEE_BPS', 350),
        state: 1,
        tokenCode,
        walletCode,
        metadata,
    }, campaignCode);

    const escrow = LaunchEscrow.createFromConfig({
        campaignAddress: campaignWithPlaceholder.address,
        projectOwner,
        targetRaiseTon: envCoins('SIMPLE_LAUNCH_TARGET_TON', '50'),
        hardCapTon: envCoins('SIMPLE_LAUNCH_HARD_CAP_TON', '50'),
        minContributionTon: envCoins('SIMPLE_LAUNCH_MIN_CONTRIBUTION_TON', '1'),
        minTotalRaiseTon: envCoins('SIMPLE_LAUNCH_MIN_TOTAL_RAISE_TON', '5'),
        endTime,
        state: 1,
    }, escrowCode);

    const token = ProjectToken.createFromConfig({
        adminAddress: campaignWithPlaceholder.address,
        maxSupply: 100_000_000n * 1_000_000_000n,
        content: metadata,
        jettonWalletCode: walletCode,
    }, tokenCode);

    console.log('=== SimpleLaunch Testnet Deployment ===');
    console.log('Mode: ' + (DRY_RUN ? 'DRY RUN' : 'EXECUTE'));
    console.log('Network: testnet');
    console.log('Campaign: ' + campaignWithPlaceholder.address.toString({ bounceable: false }));
    console.log('Escrow: ' + escrow.address.toString({ bounceable: false }));
    console.log('Predicted ProjectToken: ' + token.address.toString({ bounceable: false }));
    console.log('Project owner: ' + projectOwner.toString({ bounceable: false }));
    console.log();

    if (!DRY_RUN) {
        if (!wallet || !secretKey) throw new Error('Wallet not initialized.');
        await sendOne(wallet, secretKey, campaignWithPlaceholder.address, toNano('0.15'), beginCell().endCell(), campaignWithPlaceholder.init);
        await sendOne(wallet, secretKey, escrow.address, toNano('0.2'), beginCell().endCell(), escrow.init);
        await sendOne(
            wallet,
            secretKey,
            campaignWithPlaceholder.address,
            toNano('0.05'),
            beginCell().storeUint(8, 32).storeUint(0, 64).storeAddress(escrow.address).endCell(),
        );
    }

    const manifest = {
        network: 'testnet',
        product: 'SimpleLaunch',
        version: 'v1',
        status: DRY_RUN ? 'planned' : 'deployed',
        generatedAt: new Date().toISOString(),
        deployer: deployerAddress.equals(ZERO_ADDRESS) ? '(dry-run placeholder)' : deployerAddress.toString({ bounceable: false }),
        contracts: {
            SIMPLE_LAUNCH_CAMPAIGN: campaignWithPlaceholder.address.toString({ bounceable: false }),
            LAUNCH_ESCROW: escrow.address.toString({ bounceable: false }),
            PROJECT_TOKEN: token.address.toString({ bounceable: false }),
        },
        config: {
            projectOwner: projectOwner.toString({ bounceable: false }),
            teamWallet: teamWallet.toString({ bounceable: false }),
            platformFund: platformFund.toString({ bounceable: false }),
            targetRaiseTon: process.env.SIMPLE_LAUNCH_TARGET_TON || '50',
            hardCapTon: process.env.SIMPLE_LAUNCH_HARD_CAP_TON || '50',
            minContributionTon: process.env.SIMPLE_LAUNCH_MIN_CONTRIBUTION_TON || '1',
            minParticipants: envNumber('SIMPLE_LAUNCH_MIN_PARTICIPANTS', 5),
            minTotalRaiseTon: process.env.SIMPLE_LAUNCH_MIN_TOTAL_RAISE_TON || '5',
            endTime,
            platformFeeBps: envNumber('SIMPLE_LAUNCH_PLATFORM_FEE_BPS', 350),
        },
        flow: {
            activation: 'pending',
            finalize: 'pending',
            claim: 'pending',
            refund: 'pending',
            withdraw: 'pending',
        },
        notes: [
            'Testnet only. Do not use these addresses for mainnet.',
            'Execute mode deploys campaign and escrow, then binds escrow on the campaign.',
            'ProjectToken is deployed by campaign activation, not by this deployment script.',
            'D1 SQL is not executed by this script.',
        ],
    };

    mkdirSync(resolve(process.cwd(), 'deployments'), { recursive: true });
    const outPath = OVERRIDE_MANIFEST_PATH || (DRY_RUN ? PLAN_MANIFEST_PATH : DEPLOYED_MANIFEST_PATH);
    writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log('Manifest ' + (DRY_RUN ? 'plan' : 'saved') + ': ' + outPath);
    console.log(DRY_RUN ? 'No transactions sent.' : 'Deployment complete. Tx hashes not captured by script.');
}

main().catch(e => {
    console.error('SimpleLaunch deployment failed: ' + String(e.message || e));
    process.exit(1);
});

import { Address, beginCell, Cell, contractAddress } from '@ton/core';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

import { EarlyFundraising } from '../wrappers/EarlyFundraising';
import { Fund } from '../wrappers/Fund';
import { LaunchFee } from '../wrappers/LaunchFee';
import { TokenLauncher } from '../wrappers/TokenLauncher';
import { VCRewardPool } from '../wrappers/VCRewardPool';
import { VcJetton } from '../wrappers/VcJetton';

const NETWORK = process.env.TON_NETWORK || '';
const ALLOW = process.env.ALLOW_MAINNET_PLAN === '1';
const OUT = process.env.MAINNET_DRY_RUN_MANIFEST || resolve(process.cwd(), 'deployments', 'mainnet.platform.dry-run.json');

if (NETWORK !== 'mainnet') {
    throw new Error('Refusing mainnet plan unless TON_NETWORK=mainnet.');
}
if (!ALLOW) {
    throw new Error('Refusing mainnet plan unless ALLOW_MAINNET_PLAN=1.');
}

function requiredAddress(name: string): Address {
    const raw = process.env[name]?.trim();
    if (!raw) throw new Error(`Set ${name} before generating mainnet dry-run manifest.`);
    return Address.parse(raw);
}

function loadCode(name: string): Cell {
    const artifactPath = resolve(process.cwd(), 'build', `${name}.json`);
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as { code_boc64: string };
    return Cell.fromBoc(Buffer.from(artifact.code_boc64, 'base64'))[0];
}

function contentCell(uri: string): Cell {
    return beginCell().storeUint(1, 8).storeBuffer(Buffer.from(uri, 'utf8')).endCell();
}

function jettonWalletAddress(owner: Address, master: Address, walletCode: Cell): Address {
    const data = beginCell()
        .storeCoins(0)
        .storeAddress(owner)
        .storeAddress(master)
        .storeRef(walletCode)
        .endCell();
    return contractAddress(0, { code: walletCode, data });
}

async function main() {
    execFileSync('acton', ['build'], { cwd: process.cwd(), stdio: 'inherit' });

    const admin = requiredAddress('MAINNET_ADMIN_ADDRESS');
    const earlyOps = requiredAddress('VC_EARLY_OPS_ADDRESS');
    const liquidity = requiredAddress('VC_LIQUIDITY_ADDRESS');
    const treasury = Address.parse(process.env.VC_EARLY_TREASURY_ADDRESS || earlyOps.toString({ bounceable: false }));
    const metadataUri = process.env.VC_METADATA_URI?.trim();
    if (!metadataUri) throw new Error('Set VC_METADATA_URI before generating mainnet dry-run manifest.');

    const vcJettonCode = loadCode('vc_jetton');
    const walletCode = loadCode('project_token_wallet');
    const fundCode = loadCode('fund');
    const rewardPoolCode = loadCode('vc_reward_pool');
    const earlyFundraisingCode = loadCode('early_fundraising');
    const launchFeeCode = loadCode('launch_fee');
    const tokenLauncherCode = loadCode('token_launcher');
    const projectTokenCode = loadCode('project_token');

    const vcJetton = VcJetton.createFromConfig({
        adminAddress: admin,
        content: contentCell(metadataUri),
        jettonWalletCode: walletCode,
    }, vcJettonCode);
    const fund = Fund.createFromConfig({
        adminAddress: admin,
        vcMasterAddress: vcJetton.address,
        vcWalletCode: walletCode,
        myVcWalletAddress: admin,
    }, fundCode);
    const rewardPool = VCRewardPool.createFromConfig({
        adminAddress: admin,
        vcMasterAddress: vcJetton.address,
        vcWalletCode: walletCode,
        myVcWalletAddress: admin,
        developerPool: 100_000_000n * 1_000_000_000n,
        ecosystemPool: 350_000_000n * 1_000_000_000n,
    }, rewardPoolCode);
    const earlyFundraising = EarlyFundraising.createFromConfig({
        adminAddress: admin,
        vcMasterAddress: vcJetton.address,
        vcWalletCode: walletCode,
        myVcWalletAddress: admin,
        treasuryAddress: treasury,
    }, earlyFundraisingCode);
    const launchFee = LaunchFee.createFromConfig({
        adminAddress: admin,
        vcMasterAddress: vcJetton.address,
        vcWalletCode: walletCode,
        myVcWalletAddress: admin,
        fundAddress: fund.address,
        deploymentFee: 300n * 1_000_000_000n,
        antiSpamStake: 500n * 1_000_000_000n,
    }, launchFeeCode);
    const launcher = TokenLauncher.createFromConfig({
        adminAddress: admin,
        masterCode: projectTokenCode,
        walletCode,
    }, tokenLauncherCode);

    const contracts = [
        ['VC_JETTON', vcJetton],
        ['FUND', fund],
        ['VC_REWARD_POOL', rewardPool],
        ['EARLY_FUNDRAISING', earlyFundraising],
        ['LAUNCH_FEE', launchFee],
        ['TOKEN_LAUNCHER', launcher],
    ] as const;

    const manifest = {
        network: 'mainnet',
        dryRun: true,
        generatedAt: new Date().toISOString(),
        admin: admin.toString({ bounceable: false }),
        adminPolicy: 'personal-wallet-retained',
        metadataUri,
        recipients: {
            earlyOps: earlyOps.toString({ bounceable: false }),
            liquidity: liquidity.toString({ bounceable: false }),
            treasury: treasury.toString({ bounceable: false }),
        },
        contracts: Object.fromEntries(contracts.map(([name, contract]) => [
            name,
            {
                address: contract.address.toString({ bounceable: false }),
                bounceable: contract.address.toString({ bounceable: true }),
                selfVcWallet: name === 'VC_JETTON' || name === 'TOKEN_LAUNCHER'
                    ? null
                    : jettonWalletAddress(contract.address, vcJetton.address, walletCode).toString({ bounceable: false }),
            },
        ])),
    };

    const outDir = resolve(OUT, '..');
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Mainnet dry-run manifest: ${OUT}`);
    console.log(JSON.stringify({
        admin: manifest.admin,
        vcJetton: manifest.contracts.VC_JETTON.address,
        launchFee: manifest.contracts.LAUNCH_FEE.address,
    }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

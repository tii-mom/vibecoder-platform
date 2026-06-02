import { mnemonicToPrivateKey } from '@ton/crypto';
import { Address, beginCell, Cell, contractAddress, toNano } from '@ton/core';
import { internal, TonClient, WalletContractV4 } from '@ton/ton';
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

const DRY_RUN = process.argv.includes('--dry-run');
const NETWORK = process.env.TON_NETWORK || 'testnet';
const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
const MNEMONIC = (process.env.DEPLOYER_MNEMONIC || '').replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
const EARLY_OPS_ADDRESS = process.env.VC_EARLY_OPS_ADDRESS || '';
const LIQUIDITY_ADDRESS = '0QDsx-vPapMJyIh3LYEQXAF_wp0iAWk8I6ZN7Vw79zqTDIjo';

if (NETWORK === 'mainnet') {
    throw new Error('deploy-platform-testnet.ts is testnet/pre-mainnet only. Refusing TON_NETWORK=mainnet.');
}

const HAS_MNEMONIC = MNEMONIC.split(' ').length >= 12;

if (!DRY_RUN && !HAS_MNEMONIC) {
    throw new Error('Set DEPLOYER_MNEMONIC in .env before non-dry-run deployment.');
}
if (!EARLY_OPS_ADDRESS) {
    throw new Error('Set VC_EARLY_OPS_ADDRESS before deployment.');
}

function endpoint() {
    const base = 'https://testnet.toncenter.com';
    return TONCENTER_KEY ? `${base}/api/v2/jsonRPC?api_key=${TONCENTER_KEY}` : `${base}/api/v2/jsonRPC`;
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

async function deployOne(client: TonClient, wallet: any, secretKey: Buffer, name: string, contract: { address: Address; init?: { code: Cell; data: Cell } }) {
    if (!contract.init) throw new Error(`${name} has no init`);
    console.log(`${name}: ${contract.address.toString({ bounceable: false })}`);
    if (DRY_RUN) return;

    const seqno = await wallet.getSeqno();
    await wallet.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: contract.address,
                value: toNano('0.15'),
                init: contract.init,
                body: beginCell().endCell(),
            }),
        ],
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 12000));
}

async function main() {
    execFileSync('acton', ['build'], { cwd: process.cwd(), stdio: 'inherit' });

    const vcJettonCode = loadCode('vc_jetton');
    const walletCode = loadCode('project_token_wallet');
    const fundCode = loadCode('fund');
    const rewardPoolCode = loadCode('vc_reward_pool');
    const earlyFundraisingCode = loadCode('early_fundraising');
    const launchFeeCode = loadCode('launch_fee');
    const tokenLauncherCode = loadCode('token_launcher');
    const projectTokenCode = loadCode('project_token');

    const keyPair = HAS_MNEMONIC
        ? await mnemonicToPrivateKey(MNEMONIC.split(' '))
        : { publicKey: Buffer.alloc(32), secretKey: Buffer.alloc(64) };
    const client = new TonClient({ endpoint: endpoint() });
    const wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
    const deployer = wallet.address;
    const placeholderWallet = deployer;
    const metadataUri = process.env.VC_METADATA_URI || 'https://ivory-keen-perch-796.mypinata.cloud/ipfs/bafkreifs5odqmuqrz5pwfx73sfxqq6r6gnpfqlpepny2mmqdxhhscwvuwi';
    const treasury = Address.parse(process.env.VC_EARLY_TREASURY_ADDRESS || EARLY_OPS_ADDRESS);

    console.log(`Network: ${NETWORK}${DRY_RUN ? ' dry-run' : ''}`);
    console.log(`Deployer: ${deployer.toString({ bounceable: false })}`);

    const vcJetton = VcJetton.createFromConfig({
        adminAddress: deployer,
        content: contentCell(metadataUri),
        jettonWalletCode: walletCode,
    }, vcJettonCode);
    const fund = Fund.createFromConfig({
        adminAddress: deployer,
        vcMasterAddress: vcJetton.address,
        vcWalletCode: walletCode,
        myVcWalletAddress: placeholderWallet,
    }, fundCode);
    const rewardPool = VCRewardPool.createFromConfig({
        adminAddress: deployer,
        vcMasterAddress: vcJetton.address,
        vcWalletCode: walletCode,
        myVcWalletAddress: placeholderWallet,
        developerPool: 100_000_000n * 1_000_000_000n,
        ecosystemPool: 350_000_000n * 1_000_000_000n,
    }, rewardPoolCode);
    const earlyFundraising = EarlyFundraising.createFromConfig({
        adminAddress: deployer,
        vcMasterAddress: vcJetton.address,
        vcWalletCode: walletCode,
        myVcWalletAddress: placeholderWallet,
        treasuryAddress: treasury,
    }, earlyFundraisingCode);
    const launchFee = LaunchFee.createFromConfig({
        adminAddress: deployer,
        vcMasterAddress: vcJetton.address,
        vcWalletCode: walletCode,
        myVcWalletAddress: placeholderWallet,
        fundAddress: fund.address,
        deploymentFee: 300n * 1_000_000_000n,
        antiSpamStake: 500n * 1_000_000_000n,
    }, launchFeeCode);
    const launcher = TokenLauncher.createFromConfig({
        adminAddress: deployer,
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

    for (const [name, contract] of contracts) {
        await deployOne(client, wallet, keyPair.secretKey, name, contract);
    }

    const manifest = {
        network: NETWORK,
        deployer: deployer.toString({ bounceable: false }),
        generatedAt: new Date().toISOString(),
        dryRun: DRY_RUN,
        recipients: {
            earlyOps: EARLY_OPS_ADDRESS,
            liquidity: LIQUIDITY_ADDRESS,
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

    const outDir = resolve(process.cwd(), 'deployments');
    if (!existsSync(outDir)) mkdirSync(outDir);
    const outPath = resolve(outDir, `${NETWORK}.platform${DRY_RUN ? '.dry-run' : ''}.json`);
    writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Manifest: ${outPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

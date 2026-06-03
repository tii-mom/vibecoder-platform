import { mnemonicToPrivateKey } from '@ton/crypto';
import { Address, beginCell, Cell, contractAddress, toNano } from '@ton/core';
import { internal, TonClient, WalletContractV4 } from '@ton/ton';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

import { DeveloperRewardPool } from '../wrappers/DeveloperRewardPool';
import { EcosystemRewardPool } from '../wrappers/EcosystemRewardPool';
import { DevelopmentFund } from '../wrappers/DevelopmentFund';
import { ReserveVault } from '../wrappers/ReserveVault';

const DRY_RUN = !process.argv.includes('--execute');
const NETWORK = process.env.TON_NETWORK || 'testnet';

if (NETWORK === 'mainnet') throw new Error('Testnet only. Refusing TON_NETWORK=mainnet.');
if (NETWORK !== 'testnet') throw new Error('Set TON_NETWORK=testnet or leave it unset.');

if (!DRY_RUN && process.env.CONFIRM_TESTNET_FULL_V3_DEPLOY !== 'YES') {
    throw new Error('Set CONFIRM_TESTNET_FULL_V3_DEPLOY=YES before executing full v3 testnet deployment.');
}

const MNEMONIC = (process.env.DEPLOYER_MNEMONIC || '').replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
const HAS_MNEMONIC = MNEMONIC.split(' ').length >= 12;
if (!DRY_RUN && !HAS_MNEMONIC) throw new Error('Set DEPLOYER_MNEMONIC before executing.');

const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
const VC_ADMIN_ADDRESS = process.env.VC_ADMIN_ADDRESS || '';
const DEPLOY_VALUE = toNano(process.env.VC_V3_FULL_DEPLOY_VALUE_TON || '0.15');

const BASE_MANIFEST_PATH = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.json');
const FULL_MANIFEST_PATH = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.full.json');
const PLAN_MANIFEST_PATH = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.full.plan.json');

if (!existsSync(BASE_MANIFEST_PATH)) throw new Error('deployments/testnet.vc-v3.json not found.');
const baseManifest = JSON.parse(readFileSync(BASE_MANIFEST_PATH, 'utf8'));

function endpoint(): string {
    const base = 'https://testnet.toncenter.com';
    return TONCENTER_KEY ? base + '/api/v2/jsonRPC?api_key=' + TONCENTER_KEY : base + '/api/v2/jsonRPC';
}

function loadCode(name: string): Cell {
    const artifactPath = resolve(process.cwd(), 'build', name + '.json');
    if (!existsSync(artifactPath)) {
        execFileSync('acton', ['build', name], { cwd: resolve(process.cwd()), stdio: 'inherit' });
    }
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as { code_boc64: string };
    return Cell.fromBoc(Buffer.from(artifact.code_boc64, 'base64'))[0];
}

function jettonWalletAddress(owner: Address, master: Address, walletCode: Cell): Address {
    const data = beginCell().storeCoins(0).storeAddress(owner).storeAddress(master).storeRef(walletCode).endCell();
    return contractAddress(0, { code: walletCode, data });
}

async function deployOne(
    client: TonClient,
    wallet: any,
    secretKey: Buffer,
    label: string,
    contract: { address: Address; init?: { code: Cell; data: Cell } },
): Promise<boolean> {
    if (!contract.init) throw new Error(label + ' has no init.');
    console.log(label + ': ' + contract.address.toString({ bounceable: false }));
    if (DRY_RUN) return true;

    try {
        const seqno = await wallet.getSeqno();
        await wallet.sendTransfer({
            seqno,
            secretKey,
            messages: [internal({
                to: contract.address,
                value: DEPLOY_VALUE,
                init: contract.init,
                body: beginCell().endCell(),
            })],
        });
        await new Promise(resolve => setTimeout(resolve, 12000));
        return true;
    } catch (e: any) {
        console.error('FAIL ' + label + ': ' + String(e.message || e));
        return false;
    }
}

async function main() {
    execFileSync('acton', ['build'], { cwd: resolve(process.cwd()), stdio: 'inherit' });

    console.log('=== VC v3 Full Testnet Deployment ===');
    console.log('Mode: ' + (DRY_RUN ? 'DRY RUN' : 'EXECUTE'));
    console.log('Network: testnet');
    console.log();

    const vcMaster = Address.parse(baseManifest.basePlatformContracts.VC_JETTON);
    const admin = VC_ADMIN_ADDRESS ? Address.parse(VC_ADMIN_ADDRESS) : Address.parse(baseManifest.recipients.treasury);
    const walletCode = loadCode('project_token_wallet');

    if (!VC_ADMIN_ADDRESS) {
        console.log('VC_ADMIN_ADDRESS missing; dry-run uses base manifest treasury as admin for address planning.');
        if (!DRY_RUN) throw new Error('VC_ADMIN_ADDRESS is required in execute mode.');
    }

    const sharedConfig = {
        adminAddress: admin,
        vcMasterAddress: vcMaster,
        vcWalletCode: walletCode,
        myVcWalletAddress: admin,
        poolAmount: toNano('100000000'),
    };

    const contracts = {
        DEVELOPER_REWARD_POOL: DeveloperRewardPool.createFromConfig(sharedConfig, loadCode('developer_reward_pool')),
        ECOSYSTEM_REWARD_POOL: EcosystemRewardPool.createFromConfig(sharedConfig, loadCode('ecosystem_reward_pool')),
        DEVELOPMENT_FUND: DevelopmentFund.createFromConfig(sharedConfig, loadCode('development_fund')),
        RESERVE_VAULT: ReserveVault.createFromConfig(sharedConfig, loadCode('reserve_vault')),
    };

    const selfVcWallets = Object.fromEntries(Object.entries(contracts).map(([key, contract]) => [
        key,
        jettonWalletAddress(contract.address, vcMaster, walletCode).toString({ bounceable: false }),
    ]));

    console.log('--- Shared Config ---');
    console.log('  admin: ' + admin.toString({ bounceable: false }));
    console.log('  vcMaster: ' + vcMaster.toString({ bounceable: false }));
    console.log('  deployValue: ' + Number(DEPLOY_VALUE) / 1e9 + ' TON');
    console.log();

    for (const [key, contract] of Object.entries(contracts)) {
        console.log('--- ' + key + ' ---');
        console.log('  predicted address: ' + contract.address.toString({ bounceable: false }));
        console.log('  self VC wallet: ' + selfVcWallets[key]);
        console.log('  funding target: 100,000,000 VC');
    }
    console.log();

    let deployer: Address | null = null;
    let wallet: any = null;
    let secretKey: Buffer | null = null;

    if (!DRY_RUN) {
        const keyPair = await mnemonicToPrivateKey(MNEMONIC.split(' '));
        secretKey = keyPair.secretKey;
        const client = new TonClient({ endpoint: endpoint() });
        wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
        deployer = wallet.address;
        console.log('Deployer: ' + wallet.address.toString({ bounceable: false }));
        console.log();

        let ok = true;
        for (const [key, contract] of Object.entries(contracts)) {
            ok = await deployOne(client, wallet, secretKey, key, contract) && ok;
        }
        if (!ok) {
            console.log('PARTIAL DEPLOYMENT: manifest not saved.');
            process.exit(1);
        }
    }

    const manifest = {
        ...baseManifest,
        network: 'testnet',
        status: DRY_RUN ? 'planned' : 'deployed',
        generatedAt: new Date().toISOString(),
        deployer: deployer ? deployer.toString({ bounceable: false }) : '(dry-run)',
        v3Contracts: {
            ...baseManifest.v3Contracts,
            ...Object.fromEntries(Object.entries(contracts).map(([key, contract]) => [
                key,
                contract.address.toString({ bounceable: false }),
            ])),
        },
        selfVcWallets: {
            ...baseManifest.selfVcWallets,
            ...selfVcWallets,
        },
        fundingTargets: {
            SALE_VESTING: '300000000',
            TEAM_VESTING: '200000000',
            DEVELOPER_REWARD_POOL: '100000000',
            ECOSYSTEM_REWARD_POOL: '100000000',
            DEVELOPMENT_FUND: '100000000',
            RESERVE_VAULT: '100000000',
        },
        notes: [
            'Testnet only. Do not use these addresses for mainnet.',
            'D1 SQL not executed automatically.',
            'Full v3 contracts must be funded and balance-verified before flow tests.',
        ],
    };

    mkdirSync(resolve(process.cwd(), 'deployments'), { recursive: true });
    const outPath = DRY_RUN ? PLAN_MANIFEST_PATH : FULL_MANIFEST_PATH;
    writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log('Manifest ' + (DRY_RUN ? 'plan' : 'saved') + ': ' + outPath);
    console.log(DRY_RUN ? 'No transactions sent.' : 'Deployment complete. Tx hashes not captured by script.');
}

main().catch(e => {
    console.error('Deployment failed: ' + String(e.message || e));
    process.exit(1);
});

import { mnemonicToPrivateKey } from '@ton/crypto';
import { Address, beginCell, Cell, contractAddress, toNano } from '@ton/core';
import { internal, TonClient, WalletContractV4 } from '@ton/ton';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

import { SaleVesting } from '../wrappers/SaleVesting';
import { TeamVesting } from '../wrappers/TeamVesting';

const DRY_RUN = !process.argv.includes('--execute');
const NETWORK = process.env.TON_NETWORK || 'testnet';

if (NETWORK === 'mainnet') {
    throw new Error('This script is testnet only. Refusing TON_NETWORK=mainnet.');
}

if (!DRY_RUN && process.env.CONFIRM_TESTNET_DEPLOY !== 'YES') {
    throw new Error('Set CONFIRM_TESTNET_DEPLOY=YES before executing testnet deployment.');
}

const MNEMONIC = (process.env.DEPLOYER_MNEMONIC || '').replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
const HAS_MNEMONIC = MNEMONIC.split(' ').length >= 12;

if (!DRY_RUN && !HAS_MNEMONIC) {
    throw new Error('Set DEPLOYER_MNEMONIC in .env before non-dry-run deployment.');
}

const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
const VC_JETTON_ADDRESS = process.env.VC_JETTON_ADDRESS || '';
const VC_TREASURY_ADDRESS = process.env.VC_TREASURY_ADDRESS || '';
const VC_TEAM_BENEFICIARY = process.env.VC_TEAM_BENEFICIARY_ADDRESS || '';
const VC_ADMIN_ADDRESS = process.env.VC_ADMIN_ADDRESS || '';
const DEPLOY_VALUE = toNano(process.env.VC_V3_DEPLOY_VALUE_TON || '0.15');

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
    const data = beginCell().storeCoins(0).storeAddress(owner).storeAddress(master)
        .storeRef(walletCode).endCell();
    return contractAddress(0, { code: walletCode, data });
}

function saveManifest(manifestPath: string, manifest: any) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

async function deployOne(
    client: TonClient, wallet: any, secretKey: Buffer,
    name: string, contract: { address: Address; init?: { code: Cell; data: Cell } }
): Promise<boolean> {
    if (!contract.init) throw new Error(name + ' has no init');
    console.log(name + ': ' + contract.address.toString({ bounceable: false }));
    if (DRY_RUN) return true;
    try {
        const seqno = await wallet.getSeqno();
        await wallet.sendTransfer({
            seqno,
            secretKey,
            messages: [internal({ to: contract.address, value: DEPLOY_VALUE, init: contract.init, body: beginCell().endCell() })],
        });
        await new Promise(r => setTimeout(r, 12000));
        return true;
    } catch (e: any) {
        console.error('FAIL ' + name + ': ' + String(e.message || e));
        return false;
    }
}

async function main() {
    execFileSync('acton', ['build'], { cwd: resolve(process.cwd()), stdio: 'inherit' });

    console.log('=== VC v3 Testnet Deployment ===');
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
        if (DRY_RUN) {
            console.log('Continuing in dry-run mode.');
        } else {
            throw new Error('Missing required environment variables.');
        }
    }

    const vcMaster = VC_JETTON_ADDRESS ? Address.parse(VC_JETTON_ADDRESS) : null;
    const treasury = VC_TREASURY_ADDRESS ? Address.parse(VC_TREASURY_ADDRESS) : null;
    const teamBeneficiary = VC_TEAM_BENEFICIARY ? Address.parse(VC_TEAM_BENEFICIARY) : null;
    const admin = VC_ADMIN_ADDRESS ? Address.parse(VC_ADMIN_ADDRESS) : null;

    const saleCode = loadCode('sale_vesting');
    const teamCode = loadCode('team_vesting');
    const walletCode = loadCode('project_token_wallet');

    const saleConfig = {
        adminAddress: admin!,
        vcMasterAddress: vcMaster!,
        vcWalletCode: walletCode,
        myVcWalletAddress: admin!,
        treasuryAddress: treasury!,
    };
    const saleContract = SaleVesting.createFromConfig(saleConfig, saleCode);

    const teamConfig = {
        adminAddress: admin!,
        vcMasterAddress: vcMaster!,
        vcWalletCode: walletCode,
        myVcWalletAddress: admin!,
        beneficiaryAddress: teamBeneficiary!,
    };
    const teamContract = TeamVesting.createFromConfig(teamConfig, teamCode);

    const saleSelfWallet = vcMaster ? jettonWalletAddress(saleContract.address, vcMaster, walletCode) : null;
    const teamSelfWallet = vcMaster ? jettonWalletAddress(teamContract.address, vcMaster, walletCode) : null;

    console.log('--- SaleVesting ---');
    console.log('  predicted address: ' + saleContract.address.toString({ bounceable: false }));
    if (saleSelfWallet) console.log('  self VC wallet: ' + saleSelfWallet.toString({ bounceable: false }));
    console.log('  saleCap: 300,000,000 VC');
    console.log();

    console.log('--- TeamVesting ---');
    console.log('  predicted address: ' + teamContract.address.toString({ bounceable: false }));
    if (teamSelfWallet) console.log('  self VC wallet: ' + teamSelfWallet.toString({ bounceable: false }));
    console.log('  allocation: 200,000,000 VC');
    console.log();

    console.log('--- Shared Config ---');
    console.log('  admin: ' + (admin ? admin.toString({ bounceable: false }) : '(missing)'));
    console.log('  vcMaster: ' + (vcMaster ? vcMaster.toString({ bounceable: false }) : '(missing)'));
    console.log('  treasury: ' + (treasury ? treasury.toString({ bounceable: false }) : '(missing)'));
    console.log('  teamBeneficiary: ' + (teamBeneficiary ? teamBeneficiary.toString({ bounceable: false }) : '(missing)'));
    console.log();

    if (DRY_RUN) {
        console.log('=== Dry-run complete. No transactions sent. ===');
        console.log('Next: set env vars, then: CONFIRM_TESTNET_DEPLOY=YES npm run deploy:vc-v3:testnet');
        return;
    }

    const keyPair = HAS_MNEMONIC
        ? await mnemonicToPrivateKey(MNEMONIC.split(' '))
        : { publicKey: Buffer.alloc(32), secretKey: Buffer.alloc(64) };
    const client = new TonClient({ endpoint: endpoint() });
    const wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
    const deployer = wallet.address;
    console.log('Deployer: ' + deployer.toString({ bounceable: false }));
    console.log();

    let saleSuccess = false;
    let teamSuccess = false;

    if (vcMaster && admin && treasury) {
        saleSuccess = await deployOne(client, wallet, keyPair.secretKey, 'SaleVesting', saleContract);
    } else {
        console.log('SKIP SaleVesting: required addresses missing');
    }

    if (vcMaster && admin && teamBeneficiary) {
        teamSuccess = await deployOne(client, wallet, keyPair.secretKey, 'TeamVesting', teamContract);
    } else {
        console.log('SKIP TeamVesting: required addresses missing');
    }

    console.log();

    if (saleSuccess) {
        console.log('OK SaleVesting deployed: ' + saleContract.address.toString({ bounceable: false }));
        if (saleSelfWallet) console.log('   self VC wallet: ' + saleSelfWallet.toString({ bounceable: false }));
    }
    if (teamSuccess) {
        console.log('OK TeamVesting deployed: ' + teamContract.address.toString({ bounceable: false }));
        if (teamSelfWallet) console.log('   self VC wallet: ' + teamSelfWallet.toString({ bounceable: false }));
    }

    if (saleSuccess && teamSuccess) {
        const manifestPath = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.json');
        const deployTime = new Date().toISOString();
        const manifest = {
            network: 'testnet',
            status: 'deployed',
            generatedAt: deployTime,
            deployer: deployer.toString({ bounceable: false }),
            basePlatformContracts: {
                VC_JETTON: 'UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf',
                FUND: 'UQADQbeXROSyyCBwE2qPuhr2cbE0hXgWhVCJawR9UVK9CH0Q',
                VC_REWARD_POOL: 'UQD6Zak3m1RdCA1OOIMFSh3fF6VrsgBIwxLcpn1o76YUiVZN',
                EARLY_FUNDRAISING: 'UQBXX3nt12ZKmeY9ITF6G_YC4eh3JCspxnOCX762sBDWdqDD',
                LAUNCH_FEE: 'UQBs3qGxQ5KMPLM1aQfolsc6uoLfHaFtZ3XT0ZtNN9hXuzW-',
                TOKEN_LAUNCHER: 'UQAYzEOHPZgHeS9gmJxGBUFJrvkn2JnBCv4uD2OmkK_FeSXs',
            },
            v3Contracts: {
                SALE_VESTING: saleContract.address.toString({ bounceable: false }),
                TEAM_VESTING: teamContract.address.toString({ bounceable: false }),
            },
            selfVcWallets: {
                SALE_VESTING: saleSelfWallet ? saleSelfWallet.toString({ bounceable: false }) : null,
                TEAM_VESTING: teamSelfWallet ? teamSelfWallet.toString({ bounceable: false }) : null,
            },
            recipients: {
                treasury: VC_TREASURY_ADDRESS,
                teamBeneficiary: VC_TEAM_BENEFICIARY,
            },
            notes: [
                'Testnet only. Do not use these addresses for mainnet.',
                'D1 SQL not executed automatically.',
                'SaleVesting and TeamVesting VC wallets must be funded before claim tests.',
            ],
        };
        mkdirSync(resolve(process.cwd(), 'deployments'), { recursive: true });
        saveManifest(manifestPath, manifest);
        console.log('Manifest saved: ' + manifestPath);
        console.log();
        console.log('=== Deployment complete. ===');
    } else {
        console.log('PARTIAL DEPLOYMENT: some contracts did not deploy successfully.');
        console.log('Manifest NOT saved. Fix issues and retry.');
        process.exit(1);
    }
}

main().catch(e => {
    console.error('Deployment failed: ' + String(e.message || e));
    process.exit(1);
});

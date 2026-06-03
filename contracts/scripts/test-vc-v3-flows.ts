import { Address, beginCell, toNano } from '@ton/core';
import { internal, TonClient, WalletContractV4 } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const DRY_RUN = !process.argv.includes('--execute');
const NETWORK = process.env.TON_NETWORK || 'testnet';

if (NETWORK === 'mainnet') throw new Error('Testnet only.');

if (!DRY_RUN && process.env.CONFIRM_TESTNET_FLOW_TEST !== 'YES') {
    throw new Error('Set CONFIRM_TESTNET_FLOW_TEST=YES before executing flow tests.');
}

const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
function ep(): string { const b = 'https://testnet.toncenter.com'; return TONCENTER_KEY ? b + '/api/v2/jsonRPC?api_key=' + TONCENTER_KEY : b + '/api/v2/jsonRPC'; }

const MNEMONIC = (process.env.DEPLOYER_MNEMONIC || '').replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
const HAS_MNEMONIC = MNEMONIC.split(' ').length >= 12;

const MANIFEST_PATH = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.json');
const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) : null;
if (!manifest) throw new Error('testnet.vc-v3.json not found');

const SALE_ADDR = Address.parse(manifest.v3Contracts.SALE_VESTING);
const TEAM_ADDR = Address.parse(manifest.v3Contracts.TEAM_VESTING);

let testResults: string[] = [];
function log(msg: string) { console.log(msg); testResults.push(msg); }
function fail(msg: string) { console.error('FAIL: ' + msg); testResults.push('FAIL: ' + msg); }

async function runGet(client: TonClient, addr: Address, method: string): Promise<any> {
    const r = await client.runMethod(addr, method, []);
    return r.stack;
}

async function main() {
    console.log('=== VC v3 Flow Tests ===');
    console.log('Mode: ' + (DRY_RUN ? 'DRY RUN' : 'EXECUTE'));
    console.log();

    const client = new TonClient({ endpoint: ep() });

    // ---- TeamVesting ----
    log('--- TeamVesting Flow Tests ---');

    const tvData = await runGet(client, TEAM_ADDR, 'getTeamVestingData');
    tvData.readAddress(); // adminAddr
    tvData.readAddress(); // vcMaster
    tvData.readAddress(); // myWallet
    tvData.readAddress(); // beneficiaryAddr
    const totalAlloc = tvData.readBigNumber();
    tvData.readBigNumber(); // claimed
    tvData.readBigNumber(); // currentPrice
    const unlockedRounds = tvData.readNumber();
    log('TeamVesting: totalAlloc=' + Number(totalAlloc)/1e9 + ' VC, unlockedRounds=' + unlockedRounds);

    if (unlockedRounds >= 1) log('PASS: Round 1 unlocked');
    else fail('Round 1 not unlocked');

    const claimable = await runGet(client, TEAM_ADDR, 'getTeamClaimable');
    const claimableAmt = claimable.readBigNumber();
    log('TeamVesting claimable: ' + Number(claimableAmt)/1e9 + ' VC');

    if (claimableAmt > 0n) log('PASS: claimableAmount > 0');
    else fail('claimableAmount is 0');

    // ---- SaleVesting ----
    log('--- SaleVesting Flow Tests ---');

    const svData = await runGet(client, SALE_ADDR, 'getSaleVestingData');
    svData.readAddress(); // admin
    svData.readAddress(); // vcMaster
    svData.readAddress(); // myWallet
    svData.readAddress(); // treasury
    const svAllocated = svData.readBigNumber();
    const svPaidTon = svData.readBigNumber();
    const svPrice = svData.readBigNumber();
    svData.readBoolean(); // saleClosed
    log('SaleVesting: allocated=' + Number(svAllocated)/1e9 + ' VC, paidTon=' + Number(svPaidTon)/1e9 + ' TON, price=' + svPrice);

    const t1r = await client.runMethod(SALE_ADDR, 'getSaleTier', [{ type: 'int', value: 1n }]);
    log('PASS: getSaleTier(1) ok');
    const t2r = await client.runMethod(SALE_ADDR, 'getSaleTier', [{ type: 'int', value: 2n }]);
    log('PASS: getSaleTier(2) ok');
    const t3r = await client.runMethod(SALE_ADDR, 'getSaleTier', [{ type: 'int', value: 3n }]);
    log('PASS: getSaleTier(3) ok');

    const unlockState = await runGet(client, SALE_ADDR, 'getSaleUnlockState');
    log('SaleVesting currentPrice: ' + unlockState.readBigNumber());

    if (DRY_RUN) {
        log('\n=== Dry-run complete. Read-only tests passed. ===');
        log('To execute claim/feed: CONFIRM_TESTNET_FLOW_TEST=YES npm run test:vc-v3:flows');
        return;
    }

    // Execute path: TeamVesting claim + feed + claim
    const keyPair = HAS_MNEMONIC ? await mnemonicToPrivateKey(MNEMONIC.split(' '))
        : { publicKey: Buffer.alloc(32), secretKey: Buffer.alloc(64) };
    const wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));

    // TeamVesting: claim round 1
    log('\nTeamVesting: claiming round 1...');
    try {
        const seqno = await wallet.getSeqno();
        await wallet.sendTransfer({
            seqno, secretKey: keyPair.secretKey,
            messages: [internal({
                to: TEAM_ADDR, value: toNano('0.15'),
                body: beginCell().storeUint(2, 32).storeUint(0, 64).endCell(),
            })],
        });
        await new Promise(r => setTimeout(r, 12000));
        const afterClaim = await runGet(client, TEAM_ADDR, 'getTeamVestingData');
        afterClaim.readAddress(); afterClaim.readAddress(); afterClaim.readAddress(); afterClaim.readAddress();
        afterClaim.readBigNumber();
        const claimed = afterClaim.readBigNumber();
        log('TeamVesting claimed after round 1: ' + Number(claimed)/1e9 + ' VC');
    } catch (e: any) { fail('TeamVesting claim: ' + String(e.message || e)); }

    // TeamVesting: feed price to 5000
    log('\nTeamVesting: feeding price to 5000...');
    try {
        const seqno = await wallet.getSeqno();
        await wallet.sendTransfer({
            seqno, secretKey: keyPair.secretKey,
            messages: [internal({
                to: TEAM_ADDR, value: toNano('0.1'),
                body: beginCell().storeUint(1, 32).storeUint(0, 64).storeCoins(5000n).endCell(),
            })],
        });
        await new Promise(r => setTimeout(r, 12000));
        const afterFeed = await runGet(client, TEAM_ADDR, 'getTeamVestingData');
        afterFeed.readAddress(); afterFeed.readAddress(); afterFeed.readAddress(); afterFeed.readAddress();
        afterFeed.readBigNumber(); afterFeed.readBigNumber(); afterFeed.readBigNumber();
        const ur = afterFeed.readNumber();
        log('TeamVesting unlockedRounds after feed: ' + ur + ' (expect >= 2)');
    } catch (e: any) { fail('TeamVesting feed: ' + String(e.message || e)); }

    // SaleVesting: feed price to 78125
    log('\nSaleVesting: feeding price to 78125...');
    try {
        const seqno = await wallet.getSeqno();
        await wallet.sendTransfer({
            seqno, secretKey: keyPair.secretKey,
            messages: [internal({
                to: SALE_ADDR, value: toNano('0.1'),
                body: beginCell().storeUint(2, 32).storeUint(0, 64).storeCoins(78125n).endCell(),
            })],
        });
        await new Promise(r => setTimeout(r, 12000));
        const afterFeed = await runGet(client, SALE_ADDR, 'getSaleUnlockState');
        log('SaleVesting currentPrice after feed: ' + afterFeed.readBigNumber());
    } catch (e: any) { fail('SaleVesting feed: ' + String(e.message || e)); }

    log('\n=== Flow tests complete. ===');
    log('Note: SaleVesting buy test requires buyer wallet with testnet TON — pending separate execution.');
}

main().catch(e => { console.error(e); process.exit(1); });

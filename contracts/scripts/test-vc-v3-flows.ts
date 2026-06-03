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

const MNEMONIC = (process.env.DEPLOYER_MNEMONIC || '').replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
const HAS_MNEMONIC = MNEMONIC.split(' ').length >= 12;
if (!DRY_RUN && !HAS_MNEMONIC) throw new Error('Set DEPLOYER_MNEMONIC before executing flow tests.');

const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
function ep(): string { const b = 'https://testnet.toncenter.com'; return TONCENTER_KEY ? b + '/api/v2/jsonRPC?api_key=' + TONCENTER_KEY : b + '/api/v2/jsonRPC'; }

const MANIFEST_PATH = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.json');
const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) : null;
if (!manifest) throw new Error('testnet.vc-v3.json not found');

const SALE_ADDR = Address.parse(manifest.v3Contracts.SALE_VESTING);
const TEAM_ADDR = Address.parse(manifest.v3Contracts.TEAM_VESTING);
const TEAM_ALLOCATION = 200_000_000n * 1_000_000_000n;

let failedCount = 0;
function log(msg: string) { console.log(msg); }
function fail(msg: string) { console.error('FAIL: ' + msg); failedCount += 1; }

async function runGet(client: TonClient, addr: Address, method: string): Promise<any> {
    const r = await client.runMethod(addr, method, []);
    return r.stack;
}

async function main() {
    console.log('=== VC v3 Flow Tests ===');
    console.log('Mode: ' + (DRY_RUN ? 'DRY RUN' : 'EXECUTE'));
    console.log();

    const client = new TonClient({ endpoint: ep() });

    log('--- TeamVesting Flow Tests ---');

    const tvData = await runGet(client, TEAM_ADDR, 'getTeamVestingData');
    tvData.readAddress(); tvData.readAddress(); tvData.readAddress(); tvData.readAddress();
    const totalAlloc = tvData.readBigNumber();
    const claimedAmount = tvData.readBigNumber();
    tvData.readBigNumber();
    const unlockedRounds = tvData.readNumber();
    log(
        'TeamVesting: totalAlloc=' + Number(totalAlloc)/1e9 +
        ' VC, claimed=' + Number(claimedAmount)/1e9 +
        ' VC, unlockedRounds=' + unlockedRounds
    );

    if (totalAlloc === TEAM_ALLOCATION) log('PASS: TeamVesting allocation is 200M VC');
    else fail('TeamVesting allocation is ' + Number(totalAlloc)/1e9 + ' VC, expected 200M VC');

    if (claimedAmount <= totalAlloc) log('PASS: TeamVesting claimedAmount <= allocation');
    else fail('TeamVesting claimedAmount exceeds allocation');

    if (unlockedRounds >= 1) log('PASS: Round 1 unlocked');
    else fail('Round 1 not unlocked');

    const claimable = await runGet(client, TEAM_ADDR, 'getTeamClaimable');
    const claimableAmt = claimable.readBigNumber();
    const vestedAmt = claimable.readBigNumber();
    const claimableClaimedAmt = claimable.readBigNumber();
    log('TeamVesting claimable: ' + Number(claimableAmt)/1e9 + ' VC');
    log('TeamVesting vested: ' + Number(vestedAmt)/1e9 + ' VC');

    if (claimableAmt > 0n) log('PASS: claimableAmount > 0');
    else if (claimableClaimedAmt === vestedAmt && claimedAmount === vestedAmt) {
        log('PASS: claimableAmount is 0 because current vested amount was already claimed');
    } else {
        fail('claimableAmount is 0 but claimed/vested state is inconsistent');
    }

    const r2 = await client.runMethod(TEAM_ADDR, 'getTeamVestingRound', [{ type: 'int', value: 2n }]);
    const r2Price = r2.stack.readBigNumber();
    log('TeamVesting round 2 threshold: ' + r2Price);

    const r10 = await client.runMethod(TEAM_ADDR, 'getTeamVestingRound', [{ type: 'int', value: 10n }]);
    const r10Price = r10.stack.readBigNumber();
    log('TeamVesting round 10 threshold: ' + r10Price);

    log('--- SaleVesting Flow Tests ---');

    const svData = await runGet(client, SALE_ADDR, 'getSaleVestingData');
    svData.readAddress(); svData.readAddress(); svData.readAddress(); svData.readAddress();
    const svAllocated = svData.readBigNumber();
    const svPaidTon = svData.readBigNumber();
    const svPrice = svData.readBigNumber();
    svData.readBoolean();
    log('SaleVesting: allocated=' + Number(svAllocated)/1e9 + ' VC, paidTon=' + Number(svPaidTon)/1e9 + ' TON, price=' + svPrice);

    await client.runMethod(SALE_ADDR, 'getSaleTier', [{ type: 'int', value: 1n }]);
    log('PASS: getSaleTier(1) ok');
    await client.runMethod(SALE_ADDR, 'getSaleTier', [{ type: 'int', value: 2n }]);
    log('PASS: getSaleTier(2) ok');
    await client.runMethod(SALE_ADDR, 'getSaleTier', [{ type: 'int', value: 3n }]);
    log('PASS: getSaleTier(3) ok');

    const unlockState = await runGet(client, SALE_ADDR, 'getSaleUnlockState');
    log('SaleVesting currentPrice: ' + unlockState.readBigNumber());

    if (DRY_RUN) {
        log('\n=== Dry-run complete. Read-only tests done. ===');
        if (failedCount > 0) {
            console.error('FAILED: ' + failedCount + ' check(s) failed.');
            process.exit(1);
        }
        log('To execute claim/feed: CONFIRM_TESTNET_FLOW_TEST=YES npm run test:vc-v3:flows');
        return;
    }

    const keyPair = await mnemonicToPrivateKey(MNEMONIC.split(' '));
    const w = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));

    log('\nTeamVesting: claiming round 1...');
    try {
        const seqno = await w.getSeqno();
        await w.sendTransfer({ seqno, secretKey: keyPair.secretKey,
            messages: [internal({ to: TEAM_ADDR, value: toNano('0.15'),
                body: beginCell().storeUint(2, 32).storeUint(0, 64).endCell() })] });
        await new Promise(r => setTimeout(r, 12000));
        const ac = await runGet(client, TEAM_ADDR, 'getTeamVestingData');
        ac.readAddress(); ac.readAddress(); ac.readAddress(); ac.readAddress(); ac.readBigNumber();
        log('TeamVesting claimed: ' + Number(ac.readBigNumber())/1e9 + ' VC');
    } catch (e: any) { fail('TeamVesting claim: ' + String(e.message || e)); }

    log('\nTeamVesting: feeding price to 5000...');
    try {
        const seqno = await w.getSeqno();
        await w.sendTransfer({ seqno, secretKey: keyPair.secretKey,
            messages: [internal({ to: TEAM_ADDR, value: toNano('0.1'),
                body: beginCell().storeUint(1, 32).storeUint(0, 64).storeCoins(5000n).endCell() })] });
        await new Promise(r => setTimeout(r, 12000));
        const af = await runGet(client, TEAM_ADDR, 'getTeamVestingData');
        af.readAddress(); af.readAddress(); af.readAddress(); af.readAddress(); af.readBigNumber(); af.readBigNumber(); af.readBigNumber();
        log('TeamVesting unlockedRounds: ' + af.readNumber());
    } catch (e: any) { fail('TeamVesting feed: ' + String(e.message || e)); }

    log('\nSaleVesting: feeding price to 78125...');
    try {
        const seqno = await w.getSeqno();
        await w.sendTransfer({ seqno, secretKey: keyPair.secretKey,
            messages: [internal({ to: SALE_ADDR, value: toNano('0.1'),
                body: beginCell().storeUint(2, 32).storeUint(0, 64).storeCoins(78125n).endCell() })] });
        await new Promise(r => setTimeout(r, 12000));
        const us = await runGet(client, SALE_ADDR, 'getSaleUnlockState');
        log('SaleVesting currentPrice: ' + us.readBigNumber());
    } catch (e: any) { fail('SaleVesting feed: ' + String(e.message || e)); }

    log('\n=== Flow tests complete. ===');
    log('Note: SaleVesting buy test requires buyer wallet with test TON — pending.');
    if (failedCount > 0) { console.error('FAILED: ' + failedCount + ' check(s).'); process.exit(1); }
}

main().catch(e => { console.error(e); process.exit(1); });

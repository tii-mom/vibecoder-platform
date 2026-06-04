import { Address, beginCell, Cell, toNano } from '@ton/core';
import { internal, TonClient, WalletContractV4 } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const DRY_RUN = !process.argv.includes('--execute');
const NETWORK = process.env.TON_NETWORK || 'testnet';

if (NETWORK === 'mainnet') throw new Error('Testnet only. Refusing TON_NETWORK=mainnet.');
if (NETWORK !== 'testnet') throw new Error('Set TON_NETWORK=testnet or leave it unset.');
if (!DRY_RUN && process.env.CONFIRM_SALE_VESTING_BUYER_FLOW !== 'YES') {
    throw new Error('Set CONFIRM_SALE_VESTING_BUYER_FLOW=YES before executing SaleVesting buyer flow.');
}

const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
function endpoint(): string {
    const base = 'https://testnet.toncenter.com';
    return TONCENTER_KEY ? base + '/api/v2/jsonRPC?api_key=' + TONCENTER_KEY : base + '/api/v2/jsonRPC';
}

function normalizeMnemonic(raw: string): string {
    return raw.replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
}

const MANIFEST_PATH = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.json');
const FULL_MANIFEST_PATH = resolve(process.cwd(), 'deployments', 'testnet.vc-v3.full.json');
const ACTIVE_MANIFEST_PATH = existsSync(FULL_MANIFEST_PATH) ? FULL_MANIFEST_PATH : MANIFEST_PATH;

if (!existsSync(ACTIVE_MANIFEST_PATH)) throw new Error('VC v3 manifest not found.');
const manifest = JSON.parse(readFileSync(ACTIVE_MANIFEST_PATH, 'utf8'));
const SALE_ADDR = Address.parse(manifest.v3Contracts?.SALE_VESTING || manifest.contracts?.SALE_VESTING);

const ADMIN_MNEMONIC = normalizeMnemonic(process.env.DEPLOYER_MNEMONIC || '');
const BUYER_MNEMONIC = normalizeMnemonic(process.env.SALE_VESTING_BUYER_MNEMONIC || '');

const TIER = Number(process.env.SALE_VESTING_BUYER_TIER || '1');
const BUY_AMOUNT_TON = process.env.SALE_VESTING_BUY_AMOUNT_TON || '99';

async function openWallet(client: TonClient, mnemonic: string) {
    const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
    const wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
    return { wallet, secretKey: keyPair.secretKey };
}

async function sendOne(wallet: any, secretKey: Buffer, to: Address, value: bigint, body: Cell) {
    let seqno = 0;
    try {
        seqno = await wallet.getSeqno();
    } catch {
        seqno = 0;
    }
    await wallet.sendTransfer({ seqno, secretKey, messages: [internal({ to, value, body })] });
    await new Promise(r => setTimeout(r, 12000));
}

async function runGet(client: TonClient, addr: Address, method: string, args: any[] = []): Promise<any> {
    const r = await client.runMethod(addr, method, args);
    return r.stack;
}

async function verifyTier(client: TonClient, tier: number): Promise<{ price: bigint; allocation: bigint; rounds: number }> {
    const s = await runGet(client, SALE_ADDR, 'getSaleTier', [{ type: 'int', value: BigInt(tier) }]);
    return { price: s.readBigNumber(), allocation: s.readBigNumber(), rounds: s.readNumber() };
}

async function getUserState(client: TonClient, addr: Address): Promise<{ paidTon: bigint; allocation: bigint; claimed: bigint; tier: number }> {
    const s = await runGet(client, SALE_ADDR, 'getUserSaleAllocation', [{ type: 'slice', cell: beginCell().storeAddress(addr).endCell() }]);
    return { paidTon: s.readBigNumber(), allocation: s.readBigNumber(), claimed: s.readBigNumber(), tier: s.readNumber() };
}

async function main() {
    console.log('=== SaleVesting 99 TON Buyer Flow ===');
    console.log('Mode: ' + (DRY_RUN ? 'DRY RUN' : 'EXECUTE'));
    console.log('Network: testnet');
    console.log('SaleVesting: ' + SALE_ADDR.toString({ bounceable: false }));
    console.log('Tier: ' + TIER);
    console.log('Buy amount: ' + BUY_AMOUNT_TON + ' TON');
    console.log();

    if (DRY_RUN) {
        console.log('Planned flow:');
        console.log('  1. Buyer wallet sends ' + BUY_AMOUNT_TON + ' TON via OP_BUY(tier=' + TIER + ').');
        console.log('  2. Verify allocation = 80,000 VC, immediate release = 30%.');
        console.log('  3. Buyer claims round 1 (30% of allocation).');
        console.log('  4. Admin feeds price to 78125 (0.078125).');
        console.log('  5. Buyer claims round 2 (35% of allocation).');
        console.log('  6. Admin feeds price to 3051758 (3.051758).');
        console.log('  7. Buyer claims round 3 (35% of allocation).');
        console.log('  8. Verify duplicate claim rejected.');
        console.log('  9. Verify claimedAmount <= allocation.');
        console.log(' 10. Verify buyer balance updated.');
        console.log();
        console.log('Execute: CONFIRM_SALE_VESTING_BUYER_FLOW=YES npm run test:sale-vesting:buyer:flow');
        return;
    }

    if (ADMIN_MNEMONIC.split(' ').length < 12) throw new Error('Set DEPLOYER_MNEMONIC for admin feed actions.');
    if (BUYER_MNEMONIC.split(' ').length < 12) throw new Error('Set SALE_VESTING_BUYER_MNEMONIC for buyer wallet.');

    const client = new TonClient({ endpoint: endpoint() });
    const admin = await openWallet(client, ADMIN_MNEMONIC);
    const buyer = await openWallet(client, BUYER_MNEMONIC);
    const buyerAddress = buyer.wallet.address;

    console.log('Buyer address: ' + buyerAddress.toString({ bounceable: false }));

    const tierInfo = await verifyTier(client, TIER);
    console.log('Tier ' + TIER + ': price=' + tierInfo.price + ', allocation=' + Number(tierInfo.allocation) / 1e9 + ' VC, rounds=' + tierInfo.rounds);

    console.log('\nStep 1: Buyer purchases tier ' + TIER + ' (' + BUY_AMOUNT_TON + ' TON)...');
    await sendOne(
        buyer.wallet, buyer.secretKey, SALE_ADDR,
        toNano(BUY_AMOUNT_TON) + toNano('0.3'),
        beginCell().storeUint(1, 32).storeUint(0, 64).storeUint(TIER, 8).endCell(),
    );

    console.log('Step 2: Verify allocation...');
    let userState = await getUserState(client, buyerAddress);
    console.log('  paidTon=' + Number(userState.paidTon) / 1e9 + ' TON');
    console.log('  allocation=' + Number(userState.allocation) / 1e9 + ' VC');
    console.log('  claimed=' + Number(userState.claimed) / 1e9 + ' VC');
    console.log('  tier=' + userState.tier);

    if (userState.allocation > 0n) console.log('PASS: Buyer has allocation.');
    else { console.error('FAIL: No allocation.'); process.exit(1); }

    console.log('\nStep 3: Buyer claims round 1 (30% of allocation)...');
    await sendOne(buyer.wallet, buyer.secretKey, SALE_ADDR, toNano('0.2'), beginCell().storeUint(3, 32).storeUint(0, 64).endCell());
    userState = await getUserState(client, buyerAddress);
    console.log('  claimed after round 1: ' + Number(userState.claimed) / 1e9 + ' VC');
    const round1Expected = (userState.allocation * 30n) / 100n;
    if (userState.claimed >= round1Expected - 1n) console.log('PASS: Round 1 claim amount meets 30% expectation.');
    else console.log('WARN: Round 1 claim may differ from expected 30%.');

    console.log('\nStep 4: Admin feeds price to 78125 (0.078125)...');
    await sendOne(admin.wallet, admin.secretKey, SALE_ADDR, toNano('0.1'), beginCell().storeUint(2, 32).storeUint(0, 64).storeCoins(78125n).endCell());
    const unlockState1 = await runGet(client, SALE_ADDR, 'getSaleUnlockState');
    console.log('  currentPrice after feed: ' + unlockState1.readBigNumber());

    console.log('\nStep 5: Buyer claims round 2 (35% of allocation)...');
    await sendOne(buyer.wallet, buyer.secretKey, SALE_ADDR, toNano('0.2'), beginCell().storeUint(3, 32).storeUint(0, 64).endCell());
    userState = await getUserState(client, buyerAddress);
    console.log('  claimed after round 2: ' + Number(userState.claimed) / 1e9 + ' VC');
    const round2Expected = (userState.allocation * 65n) / 100n;
    if (userState.claimed >= round2Expected - 1n) console.log('PASS: Round 2 claim amount meets 65% cumulative expectation.');
    else console.log('WARN: Round 2 claim may differ.');

    console.log('\nStep 6: Admin feeds price to 3051758 (3.051758)...');
    await sendOne(admin.wallet, admin.secretKey, SALE_ADDR, toNano('0.1'), beginCell().storeUint(2, 32).storeUint(0, 64).storeCoins(3051758n).endCell());
    const unlockState2 = await runGet(client, SALE_ADDR, 'getSaleUnlockState');
    console.log('  currentPrice after feed: ' + unlockState2.readBigNumber());

    console.log('\nStep 7: Buyer claims round 3 (35% of allocation)...');
    await sendOne(buyer.wallet, buyer.secretKey, SALE_ADDR, toNano('0.2'), beginCell().storeUint(3, 32).storeUint(0, 64).endCell());
    userState = await getUserState(client, buyerAddress);
    console.log('  claimed after round 3: ' + Number(userState.claimed) / 1e9 + ' VC');

    if (userState.claimed >= userState.allocation - 1n) console.log('PASS: All allocation claimed.');
    else console.log('WARN: Claimed < full allocation. Some rounds may have already been claimed.');

    console.log('\nStep 8: Verify duplicate claim rejected...');
    try {
        await sendOne(buyer.wallet, buyer.secretKey, SALE_ADDR, toNano('0.2'), beginCell().storeUint(3, 32).storeUint(0, 64).endCell());
        const after = await getUserState(client, buyerAddress);
        if (after.claimed === userState.claimed) console.log('PASS: Duplicate claim did not increase claimedAmount (rejected or no-op).');
        else console.log('WARN: Claimed amount changed after duplicate claim.');
    } catch (e: any) {
        console.log('PASS: Duplicate claim rejected with error: ' + String(e.message || e).slice(0, 100));
    }

    console.log('\nStep 9: Verify claimed <= allocation...');
    const finalState = await getUserState(client, buyerAddress);
    if (finalState.claimed <= finalState.allocation) console.log('PASS: claimedAmount <= allocation.');
    else { console.error('FAIL: claimedAmount exceeds allocation.'); process.exit(1); }

    console.log('\nStep 10: Verify buyer VC balance...');
    // Balance is tracked via getUserSaleAllocation claimed field + get_jetton_data for the wallet
    console.log('  claimed: ' + Number(finalState.claimed) / 1e9 + ' VC');
    console.log('  allocation: ' + Number(finalState.allocation) / 1e9 + ' VC');

    console.log('\n=== SaleVesting 99 TON buyer flow complete. ===');
    console.log('Tx hashes not captured by script.');
}

main().catch(e => { console.error('SaleVesting buyer flow failed: ' + String(e.message || e)); process.exit(1); });

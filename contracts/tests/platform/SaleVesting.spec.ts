import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, Slice, toNano } from '@ton/core';
import { SaleVesting } from '../../wrappers/SaleVesting';
import { compileActonCode } from '../helpers/actonArtifacts';
import { deployJettonWallet } from '../helpers/jettonWallet';
import '@ton/test-utils';

const VC = 1_000_000_000n;

function outgoingJettonAmount(transactions: any[], from: any, to: any): bigint | null {
    for (const tx of transactions) {
        if (tx.inMessage?.info?.src?.equals?.(from) && tx.inMessage?.info?.dest?.equals?.(to)) {
            let body = tx.inMessage.body.beginParse() as Slice;
            if (body.remainingBits < 32 && body.remainingRefs > 0) {
                body = body.loadRef().beginParse() as Slice;
            }
            if (body.remainingBits >= 32 && body.loadUint(32) === 0x0f8a7ea5) {
                body.loadUintBig(64);
                return body.loadCoins();
            }
        }
    }
    return null;
}

describe('SaleVesting via Acton artifacts', () => {
    let code: Cell;
    let walletCode: Cell;
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let vcMaster: SandboxContract<TreasuryContract>;
    let myWallet: SandboxContract<TreasuryContract>;
    let treasury: SandboxContract<TreasuryContract>;
    let saleVesting: SandboxContract<SaleVesting>;

    beforeAll(() => {
        code = compileActonCode('sale_vesting');
        walletCode = compileActonCode('project_token_wallet');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        vcMaster = await blockchain.treasury('vcMaster');
        myWallet = await blockchain.treasury('myWallet');
        treasury = await blockchain.treasury('treasury');

        saleVesting = blockchain.openContract(SaleVesting.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: myWallet.address,
            treasuryAddress: treasury.address,
        }, code));

        const deploy = await saleVesting.sendDeploy(admin.getSender(), toNano('0.05'));
        expect(deploy.transactions).toHaveTransaction({ from: admin.address, to: saleVesting.address, deploy: true, success: true });
        await deployJettonWallet(blockchain, vcMaster, walletCode, saleVesting.address);
    });

    it('initial data and self wallet recalculation', async () => {
        const data = await saleVesting.getSaleVestingData();
        expect(data.adminAddress.equals(admin.address)).toBe(true);
        expect(data.vcMasterAddress.equals(vcMaster.address)).toBe(true);
        expect(data.treasuryAddress.equals(treasury.address)).toBe(true);
        expect(data.totalAllocated).toBe(0n);
        expect(data.totalPaidTon).toBe(0n);
        expect(data.currentPrice).toBe(0n);
        expect(data.saleClosed).toBe(0);

        const wallet = await deployJettonWallet(blockchain, vcMaster, walletCode, saleVesting.address);
        expect(data.myVcWalletAddress.equals(wallet)).toBe(true);
    });

    it('buy Tier 1 with immediate release', async () => {
        const buyer = await blockchain.treasury('buyer');
        const buy = await saleVesting.sendBuy(buyer.getSender(), toNano('100'), 1);

        expect(buy.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: true });
        const data = await saleVesting.getSaleVestingData();
        expect(data.totalPaidTon).toBe(toNano('99'));
        expect(data.totalAllocated).toBe(80_000n * VC);

        const user = await saleVesting.getUserSaleAllocation(buyer.address);
        expect(user.allocation).toBe(80_000n * VC);
        expect(user.claimed).toBe(24_000n * VC); // 30%
        expect(user.tier).toBe(1);

        expect(outgoingJettonAmount(buy.transactions, saleVesting.address, data.myVcWalletAddress)).toBe(24_000n * VC);
    });

    it('buy Tier 2 with immediate release', async () => {
        const buyer = await blockchain.treasury('buyer');
        const buy = await saleVesting.sendBuy(buyer.getSender(), toNano('300'), 2);

        expect(buy.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: true });
        const data = await saleVesting.getSaleVestingData();
        expect(data.totalPaidTon).toBe(toNano('299'));
        expect(data.totalAllocated).toBe(250_000n * VC);

        const user = await saleVesting.getUserSaleAllocation(buyer.address);
        expect(user.allocation).toBe(250_000n * VC);
        expect(user.claimed).toBe(50_000n * VC); // 20%
        expect(user.tier).toBe(2);
    });

    it('buy Tier 3 with immediate release', async () => {
        const buyer = await blockchain.treasury('buyer');
        const buy = await saleVesting.sendBuy(buyer.getSender(), toNano('600'), 3);

        expect(buy.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: true });
        const data = await saleVesting.getSaleVestingData();
        expect(data.totalPaidTon).toBe(toNano('599'));
        expect(data.totalAllocated).toBe(599_000n * VC);

        const user = await saleVesting.getUserSaleAllocation(buyer.address);
        expect(user.allocation).toBe(599_000n * VC);
        expect(user.claimed).toBe(59_900n * VC); // 10%
        expect(user.tier).toBe(3);
    });

    it('rejects insufficient TON with 4103', async () => {
        const buyer = await blockchain.treasury('buyer');
        const buy = await saleVesting.sendBuy(buyer.getSender(), toNano('50'), 1);
        expect(buy.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: false, exitCode: 4103 });
    });

    it('rejects invalid tier with 4102', async () => {
        const buyer = await blockchain.treasury('buyer');
        const buy = await saleVesting.sendBuy(buyer.getSender(), toNano('100'), 4);
        expect(buy.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: false, exitCode: 4102 });
    });

    it('rejects duplicate buy with 4105', async () => {
        const buyer = await blockchain.treasury('buyer');
        await saleVesting.sendBuy(buyer.getSender(), toNano('100'), 1);
        const buy2 = await saleVesting.sendBuy(buyer.getSender(), toNano('300'), 2);
        expect(buy2.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: false, exitCode: 4105 });
    });

    it('getSaleTier returns correct data', async () => {
        const tier1 = await saleVesting.getSaleTier(1);
        expect(tier1.price).toBe(toNano('99'));
        expect(tier1.allocation).toBe(80_000n * VC);
        expect(tier1.rounds).toBe(3);

        const tier2 = await saleVesting.getSaleTier(2);
        expect(tier2.price).toBe(toNano('299'));
        expect(tier2.allocation).toBe(250_000n * VC);
        expect(tier2.rounds).toBe(5);

        const tier3 = await saleVesting.getSaleTier(3);
        expect(tier3.price).toBe(toNano('599'));
        expect(tier3.allocation).toBe(599_000n * VC);
        expect(tier3.rounds).toBe(10);
    });

    it('rejects non-admin feed price with 4106', async () => {
        const attacker = await blockchain.treasury('attacker');
        const feed = await saleVesting.sendFeedPrice(attacker.getSender(), toNano('0.05'), 78125n);
        expect(feed.transactions).toHaveTransaction({ from: attacker.address, to: saleVesting.address, success: false, exitCode: 4106 });
    });

    it('Tier 1: price 78125 unlocks round 2, price 3051758 unlocks round 3', async () => {
        const buyer = await blockchain.treasury('buyer');
        await saleVesting.sendBuy(buyer.getSender(), toNano('100'), 1);

        await saleVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 78125n);
        const claim1 = await saleVesting.sendClaim(buyer.getSender(), toNano('0.05'));
        expect(claim1.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: true });
        // 30% (round 1) + 35% (round 2) = 65%
        expect(outgoingJettonAmount(claim1.transactions, saleVesting.address, (await saleVesting.getSaleVestingData()).myVcWalletAddress)).toBe(28_000n * VC);

        await saleVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 3051758n);
        const claim2 = await saleVesting.sendClaim(buyer.getSender(), toNano('0.05'));
        expect(claim2.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: true });
        // 30% + 35% + 35% = 100%, already claimed 30%+28k=52k, remaining 28k
        expect(outgoingJettonAmount(claim2.transactions, saleVesting.address, (await saleVesting.getSaleVestingData()).myVcWalletAddress)).toBe(28_000n * VC);
    });

    it('Tier 2: incremental claim at 12500, 78125, 488281, 3051758', async () => {
        const buyer = await blockchain.treasury('buyer');
        await saleVesting.sendBuy(buyer.getSender(), toNano('300'), 2);

        // Round 2 at 12500
        await saleVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 12500n);
        const claim1 = await saleVesting.sendClaim(buyer.getSender(), toNano('0.05'));
        expect(claim1.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: true });
        // 20% (round 2) = 50k, total 100k (40%)
        expect(outgoingJettonAmount(claim1.transactions, saleVesting.address, (await saleVesting.getSaleVestingData()).myVcWalletAddress)).toBe(50_000n * VC);

        // Round 3 at 78125
        await saleVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 78125n);
        const claim2 = await saleVesting.sendClaim(buyer.getSender(), toNano('0.05'));
        expect(outgoingJettonAmount(claim2.transactions, saleVesting.address, (await saleVesting.getSaleVestingData()).myVcWalletAddress)).toBe(50_000n * VC);

        // Round 4 at 488281
        await saleVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 488281n);
        const claim3 = await saleVesting.sendClaim(buyer.getSender(), toNano('0.05'));
        expect(outgoingJettonAmount(claim3.transactions, saleVesting.address, (await saleVesting.getSaleVestingData()).myVcWalletAddress)).toBe(50_000n * VC);

        // Round 5 at 3051758
        await saleVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 3051758n);
        const claim4 = await saleVesting.sendClaim(buyer.getSender(), toNano('0.05'));
        expect(outgoingJettonAmount(claim4.transactions, saleVesting.address, (await saleVesting.getSaleVestingData()).myVcWalletAddress)).toBe(50_000n * VC);

        // Full 100% claimed, no more
        const claim5 = await saleVesting.sendClaim(buyer.getSender(), toNano('0.05'));
        expect(claim5.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: false, exitCode: 4108 });
    });

    it('Tier 3: progressive unlock at 31250 then 3051758', async () => {
        const buyer = await blockchain.treasury('buyer');
        await saleVesting.sendBuy(buyer.getSender(), toNano('600'), 3);

        // Round 1: 10% immediate, rounds 2-5 at 2000,5000,12500,31250 = up to 50%
        await saleVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 31250n);
        const claim1 = await saleVesting.sendClaim(buyer.getSender(), toNano('0.05'));
        expect(claim1.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: true });
        // Already claimed 10% (round 1 immediate), now 50% total, claim 40% more
        const allocation = 599_000n * VC;
        expect(outgoingJettonAmount(claim1.transactions, saleVesting.address, (await saleVesting.getSaleVestingData()).myVcWalletAddress)).toBe(allocation * 40n / 100n);

        // All 10 rounds at 3051758 = 100%
        await saleVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 3051758n);
        const claim2 = await saleVesting.sendClaim(buyer.getSender(), toNano('0.05'));
        expect(claim2.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: true });
        expect(outgoingJettonAmount(claim2.transactions, saleVesting.address, (await saleVesting.getSaleVestingData()).myVcWalletAddress)).toBe(allocation * 50n / 100n);

        const claim3 = await saleVesting.sendClaim(buyer.getSender(), toNano('0.05'));
        expect(claim3.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: false, exitCode: 4108 });
    });

    it('rejects duplicate claim with 4108', async () => {
        const buyer = await blockchain.treasury('buyer');
        await saleVesting.sendBuy(buyer.getSender(), toNano('100'), 1);
        const claim = await saleVesting.sendClaim(buyer.getSender(), toNano('0.05'));
        expect(claim.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: false, exitCode: 4108 });
    });

    it('non-admin withdraw TON rejected, admin withdraw TON works', async () => {
        const buyer = await blockchain.treasury('buyer');
        await saleVesting.sendBuy(buyer.getSender(), toNano('100'), 1);

        const attacker = await blockchain.treasury('attacker');
        const rejected = await saleVesting.sendWithdrawTon(attacker.getSender(), toNano('0.1'), {
            amount: toNano('1'),
            destination: treasury.address,
        });
        expect(rejected.transactions).toHaveTransaction({ from: attacker.address, to: saleVesting.address, success: false, exitCode: 4106 });

        const tonWithdraw = await saleVesting.sendWithdrawTon(admin.getSender(), toNano('0.1'), {
            amount: toNano('10'),
            destination: treasury.address,
        });
        expect(tonWithdraw.transactions).toHaveTransaction({ from: admin.address, to: saleVesting.address, success: true });
        expect(tonWithdraw.transactions).toHaveTransaction({ from: saleVesting.address, to: treasury.address, success: true });
    });

    it('admin withdraw VC works', async () => {
        const buyer = await blockchain.treasury('buyer');
        await saleVesting.sendBuy(buyer.getSender(), toNano('100'), 1);

        const vcWithdraw = await saleVesting.sendWithdrawVc(admin.getSender(), toNano('0.1'), {
            amount: 1n * VC,
            destination: treasury.address,
        });
        expect(vcWithdraw.transactions).toHaveTransaction({ from: admin.address, to: saleVesting.address, success: true });
        expect(outgoingJettonAmount(vcWithdraw.transactions, saleVesting.address, (await saleVesting.getSaleVestingData()).myVcWalletAddress)).toBe(1n * VC);
    });

    it('close sale prevents buys, non-admin close rejected', async () => {
        const attacker = await blockchain.treasury('attacker');
        const rejected = await saleVesting.sendCloseSale(attacker.getSender(), toNano('0.05'));
        expect(rejected.transactions).toHaveTransaction({ from: attacker.address, to: saleVesting.address, success: false, exitCode: 4106 });

        const closed = await saleVesting.sendCloseSale(admin.getSender(), toNano('0.05'));
        expect(closed.transactions).toHaveTransaction({ from: admin.address, to: saleVesting.address, success: true });

        const buyer = await blockchain.treasury('buyer');
        const buyAfterClose = await saleVesting.sendBuy(buyer.getSender(), toNano('100'), 1);
        expect(buyAfterClose.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: false, exitCode: 4101 });
    });

    it('rejects non-participant claim with 4107', async () => {
        const buyer = await blockchain.treasury('buyer');
        const claim = await saleVesting.sendClaim(buyer.getSender(), toNano('0.05'));
        expect(claim.transactions).toHaveTransaction({ from: buyer.address, to: saleVesting.address, success: false, exitCode: 4107 });
    });

    it('300M cap accumulation test', async () => {
        let totalAllocated = 0n;
        for (let i = 1; i <= 500; i++) {
            const buyer = await blockchain.treasury(`buyer${i}`);
            const buy = await saleVesting.sendBuy(buyer.getSender(), toNano('100'), 1);
            if (buy.transactions.some((t: any) => t.exitCode === 4104)) break;
            if (buy.transactions.some((t: any) => t.description.type === 'generic' && t.description.computePhase.exitCode === 0 && t.description.aborted === false)) {
                const user = await saleVesting.getUserSaleAllocation(buyer.address);
                totalAllocated += user.allocation;
            }
            if (i === 500) break;
        }
        const data = await saleVesting.getSaleVestingData();
        expect(data.totalAllocated).toBe(totalAllocated);
        expect(data.totalAllocated <= 300_000_000n * VC).toBe(true);
    });

    it('getSaleUnlockState returns current price', async () => {
        const price = await saleVesting.getSaleUnlockState();
        expect(price).toBe(0n);

        await saleVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 3051758n);

        const price2 = await saleVesting.getSaleUnlockState();
        expect(price2).toBe(3051758n);
    });
});

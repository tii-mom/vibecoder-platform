import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, Slice, toNano } from '@ton/core';
import { EarlyFundraising } from '../../wrappers/EarlyFundraising';
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

describe('EarlyFundraising via Acton artifacts', () => {
    let code: Cell;
    let walletCode: Cell;
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let vcMaster: SandboxContract<TreasuryContract>;
    let myWallet: SandboxContract<TreasuryContract>;
    let treasury: SandboxContract<TreasuryContract>;
    let fundraising: SandboxContract<EarlyFundraising>;

    beforeAll(() => {
        code = compileActonCode('early_fundraising');
        walletCode = compileActonCode('project_token_wallet');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        vcMaster = await blockchain.treasury('vcMaster');
        myWallet = await blockchain.treasury('myWallet');
        treasury = await blockchain.treasury('treasury');

        fundraising = blockchain.openContract(EarlyFundraising.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: myWallet.address,
            treasuryAddress: treasury.address,
        }, code));

        const deploy = await fundraising.sendDeploy(admin.getSender(), toNano('0.05'));
        expect(deploy.transactions).toHaveTransaction({ from: admin.address, to: fundraising.address, deploy: true, success: true });
        await deployJettonWallet(blockchain, vcMaster, walletCode, fundraising.address);
    });

    it('allocates 1000 VC per TON and transfers the initial 20 percent immediately', async () => {
        const buyer = await blockchain.treasury('buyer');
        const subscribe = await fundraising.sendSubscribe(buyer.getSender(), toNano('10'));

        expect(subscribe.transactions).toHaveTransaction({ from: buyer.address, to: fundraising.address, success: true });
        expect(outgoingJettonAmount(subscribe.transactions, fundraising.address, (await fundraising.getFundraisingData()).myVcWalletAddress)).toBe(2_000n * VC);

        const data = await fundraising.getFundraisingData();
        expect(data.totalTon).toBe(toNano('10'));
        expect(data.totalAllocated).toBe(10_000n * VC);

        const user = await fundraising.getUserAllocation(buyer.address);
        expect(user.allocated).toBe(10_000n * VC);
        expect(user.claimed).toBe(2_000n * VC);
    });

    it('unlocks one additional round only after price holds for 24 hours', async () => {
        const buyer = await blockchain.treasury('buyer');
        await fundraising.sendSubscribe(buyer.getSender(), toNano('10'));

        await fundraising.sendFeedPrice(admin.getSender(), toNano('0.05'), 7000n);
        expect((await fundraising.getFundraisingData()).unlockedRounds).toBe(0);

        blockchain.now = Math.floor(Date.now() / 1000) + 86401;
        await fundraising.sendFeedPrice(admin.getSender(), toNano('0.05'), 7000n);
        expect((await fundraising.getFundraisingData()).unlockedRounds).toBe(1);

        const claim = await fundraising.sendClaim(buyer.getSender(), toNano('0.1'));
        expect(claim.transactions).toHaveTransaction({ from: buyer.address, to: fundraising.address, success: true });
        expect(outgoingJettonAmount(claim.transactions, fundraising.address, (await fundraising.getFundraisingData()).myVcWalletAddress)).toBe(1_600n * VC);
    });

    it('lets only admin withdraw raised TON to treasury or rescue VC', async () => {
        const buyer = await blockchain.treasury('buyer');
        const attacker = await blockchain.treasury('attacker');
        await fundraising.sendSubscribe(buyer.getSender(), toNano('5'));

        const rejected = await fundraising.sendWithdrawTON(attacker.getSender(), toNano('0.1'), {
            amount: toNano('1'),
            destination: treasury.address,
        });
        expect(rejected.transactions).toHaveTransaction({ from: attacker.address, to: fundraising.address, success: false, exitCode: 3103 });

        const tonWithdraw = await fundraising.sendWithdrawTON(admin.getSender(), toNano('0.1'), {
            amount: toNano('1'),
            destination: treasury.address,
        });
        expect(tonWithdraw.transactions).toHaveTransaction({ from: admin.address, to: fundraising.address, success: true });
        expect(tonWithdraw.transactions).toHaveTransaction({ from: fundraising.address, to: treasury.address, success: true });

        const vcWithdraw = await fundraising.sendWithdrawVC(admin.getSender(), toNano('0.1'), {
            amount: 1n * VC,
            destination: treasury.address,
        });
        expect(vcWithdraw.transactions).toHaveTransaction({ from: admin.address, to: fundraising.address, success: true });
        expect(outgoingJettonAmount(vcWithdraw.transactions, fundraising.address, (await fundraising.getFundraisingData()).myVcWalletAddress)).toBe(1n * VC);
    });
});

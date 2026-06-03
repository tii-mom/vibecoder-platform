import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, Slice, toNano } from '@ton/core';
import { TeamVesting } from '../../wrappers/TeamVesting';
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

describe('TeamVesting via Acton artifacts', () => {
    let code: Cell;
    let walletCode: Cell;
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let vcMaster: SandboxContract<TreasuryContract>;
    let myWallet: SandboxContract<TreasuryContract>;
    let beneficiary: SandboxContract<TreasuryContract>;
    let teamVesting: SandboxContract<TeamVesting>;

    const ROUND_AMOUNT = 20_000_000n * VC;

    beforeAll(() => {
        code = compileActonCode('team_vesting');
        walletCode = compileActonCode('project_token_wallet');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        vcMaster = await blockchain.treasury('vcMaster');
        myWallet = await blockchain.treasury('myWallet');
        beneficiary = await blockchain.treasury('beneficiary');

        teamVesting = blockchain.openContract(TeamVesting.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: myWallet.address,
            beneficiaryAddress: beneficiary.address,
        }, code));

        const deploy = await teamVesting.sendDeploy(admin.getSender(), toNano('1'));
        expect(deploy.transactions).toHaveTransaction({ from: admin.address, to: teamVesting.address, deploy: true, success: true });
        await deployJettonWallet(blockchain, vcMaster, walletCode, teamVesting.address);
    });

    it('initial data, round 1 unlocked by default', async () => {
        const data = await teamVesting.getTeamVestingData();
        expect(data.adminAddress.equals(admin.address)).toBe(true);
        expect(data.vcMasterAddress.equals(vcMaster.address)).toBe(true);
        expect(data.beneficiaryAddress.equals(beneficiary.address)).toBe(true);
        expect(data.teamAllocation).toBe(200_000_000n * VC);
        expect(data.claimedAmount).toBe(0n);
        expect(data.currentPrice).toBe(0n);
        expect(data.unlockedRounds).toBe(1);

        const wallet = await deployJettonWallet(blockchain, vcMaster, walletCode, teamVesting.address);
        expect(data.myVcWalletAddress.equals(wallet)).toBe(true);
    });

    it('round 1 price is 0', async () => {
        const r1 = await teamVesting.getTeamVestingRound(1);
        expect(r1.roundAmount).toBe(ROUND_AMOUNT);
        expect(r1.unlockPrice).toBe(0n);
        expect(r1.unlocked).toBe(1);
    });

    it('correct round price thresholds', async () => {
        const prices: [number, bigint][] = [
            [1, 0n],
            [2, 5000n],
            [3, 12500n],
            [4, 31250n],
            [5, 78125n],
            [6, 195312n],
            [7, 488281n],
            [8, 1220703n],
            [9, 3051758n],
            [10, 7629395n],
        ];
        for (const [r, price] of prices) {
            const rd = await teamVesting.getTeamVestingRound(r);
            expect(rd.unlockPrice).toBe(price);
        }
    });

    it('beneficiary can claim round 1 (20M)', async () => {
        const claim = await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        expect(claim.transactions).toHaveTransaction({ from: beneficiary.address, to: teamVesting.address, success: true });

        const data = await teamVesting.getTeamVestingData();
        expect(data.claimedAmount).toBe(ROUND_AMOUNT);
        expect(outgoingJettonAmount(claim.transactions, teamVesting.address, data.myVcWalletAddress)).toBe(ROUND_AMOUNT);
    });

    it('non-beneficiary claim rejected (4202)', async () => {
        const attacker = await blockchain.treasury('attacker');
        const claim = await teamVesting.sendClaim(attacker.getSender(), toNano('0.1'));
        expect(claim.transactions).toHaveTransaction({ from: attacker.address, to: teamVesting.address, success: false, exitCode: 4202 });
    });

    it('duplicate claim rejected (4203)', async () => {
        await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        const claim2 = await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        expect(claim2.transactions).toHaveTransaction({ from: beneficiary.address, to: teamVesting.address, success: false, exitCode: 4203 });
    });

    it('price 5000 unlocks round 2', async () => {
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 5000n);
        const data = await teamVesting.getTeamVestingData();
        expect(data.currentPrice).toBe(5000n);
        expect(data.unlockedRounds).toBe(2);
    });

    it('price 12500 unlocks round 3', async () => {
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 12500n);
        const data = await teamVesting.getTeamVestingData();
        expect(data.unlockedRounds).toBe(3);
    });

    it('price 78125 unlocks round 5', async () => {
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 78125n);
        const data = await teamVesting.getTeamVestingData();
        expect(data.unlockedRounds).toBe(5);
    });

    it('price 7629395 unlocks all 10 rounds', async () => {
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 7629395n);
        const data = await teamVesting.getTeamVestingData();
        expect(data.currentPrice).toBe(7629395n);
        expect(data.unlockedRounds).toBe(10);
    });

    it('progressive claim: price 5000 claim 40M (rounds 1-2)', async () => {
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 5000n);
        const claim = await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        expect(claim.transactions).toHaveTransaction({ from: beneficiary.address, to: teamVesting.address, success: true });
        const data = await teamVesting.getTeamVestingData();
        expect(data.claimedAmount).toBe(2n * ROUND_AMOUNT);

        const jt = outgoingJettonAmount(claim.transactions, teamVesting.address, data.myVcWalletAddress);
        expect(jt).toBe(2n * ROUND_AMOUNT);
    });

    it('progressive claim: price 12500 claim 60M (rounds 1-3)', async () => {
        await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1')); // claim round 1 first
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 12500n);
        const claim = await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        expect(claim.transactions).toHaveTransaction({ from: beneficiary.address, to: teamVesting.address, success: true });
        const data = await teamVesting.getTeamVestingData();
        expect(data.claimedAmount).toBe(3n * ROUND_AMOUNT);

        // already claimed 20M, now claim 40M more = 60M total
        expect(outgoingJettonAmount(claim.transactions, teamVesting.address, data.myVcWalletAddress)).toBe(2n * ROUND_AMOUNT);
    });

    it('progressive claim through all rounds to 200M', async () => {
        // claim round 1
        await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        // price 5000 = round 2
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 5000n);
        await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        // price 12500 = round 3
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 12500n);
        await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        // price 31250 = round 4
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 31250n);
        await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        // price 78125 = round 5
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 78125n);
        await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        // price 195312 = round 6
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 195312n);
        await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        // price 488281 = round 7
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 488281n);
        await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        // price 1220703 = round 8
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 1220703n);
        await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        // price 3051758 = round 9
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 3051758n);
        await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        // price 7629395 = round 10
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 7629395n);
        const claim = await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        expect(claim.transactions).toHaveTransaction({ from: beneficiary.address, to: teamVesting.address, success: true });
        const data = await teamVesting.getTeamVestingData();
        expect(data.claimedAmount).toBe(10n * ROUND_AMOUNT);
        expect(data.claimedAmount).toBe(200_000_000n * VC);

        // no more can be claimed
        const claimExtra = await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));
        expect(claimExtra.transactions).toHaveTransaction({ from: beneficiary.address, to: teamVesting.address, success: false, exitCode: 4203 });
    });

    it('non-admin feed price rejected (4201)', async () => {
        const attacker = await blockchain.treasury('attacker');
        const feed = await teamVesting.sendFeedPrice(attacker.getSender(), toNano('0.05'), 5000n);
        expect(feed.transactions).toHaveTransaction({ from: attacker.address, to: teamVesting.address, success: false, exitCode: 4201 });
    });

    it('non-admin withdraw TON rejected (4201)', async () => {
        const attacker = await blockchain.treasury('attacker');
        const rejected = await teamVesting.sendWithdrawTon(attacker.getSender(), toNano('0.1'), {
            amount: toNano('1'),
            destination: admin.address,
        });
        expect(rejected.transactions).toHaveTransaction({ from: attacker.address, to: teamVesting.address, success: false, exitCode: 4201 });
    });

    it('admin withdraw TON success', async () => {
        const tonWithdraw = await teamVesting.sendWithdrawTon(admin.getSender(), toNano('0.1'), {
            amount: toNano('0.05'),
            destination: beneficiary.address,
        });
        expect(tonWithdraw.transactions).toHaveTransaction({ from: admin.address, to: teamVesting.address, success: true });
        expect(tonWithdraw.transactions).toHaveTransaction({ from: teamVesting.address, to: beneficiary.address, success: true });
    });

    it('admin withdraw VC works', async () => {
        // need VC balance first; claim to fill the wallet
        await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));

        const vcWithdraw = await teamVesting.sendWithdrawVc(admin.getSender(), toNano('0.1'), {
            amount: 1n * VC,
            destination: beneficiary.address,
        });
        expect(vcWithdraw.transactions).toHaveTransaction({ from: admin.address, to: teamVesting.address, success: true });
        const data = await teamVesting.getTeamVestingData();
        expect(outgoingJettonAmount(vcWithdraw.transactions, teamVesting.address, data.myVcWalletAddress)).toBe(1n * VC);
    });

    it('getTeamClaimable reflects state after claims', async () => {
        const c1 = await teamVesting.getTeamClaimable();
        expect(c1.claimable).toBe(ROUND_AMOUNT);
        expect(c1.vested).toBe(ROUND_AMOUNT);
        expect(c1.claimed).toBe(0n);

        await teamVesting.sendClaim(beneficiary.getSender(), toNano('0.1'));

        const c2 = await teamVesting.getTeamClaimable();
        expect(c2.claimable).toBe(0n);
        expect(c2.vested).toBe(ROUND_AMOUNT);
        expect(c2.claimed).toBe(ROUND_AMOUNT);

        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 5000n);

        const c3 = await teamVesting.getTeamClaimable();
        expect(c3.claimable).toBe(ROUND_AMOUNT); // round 2 unlocked, round 1 already claimed
        expect(c3.vested).toBe(2n * ROUND_AMOUNT);
        expect(c3.claimed).toBe(ROUND_AMOUNT);
    });

    it('unlockedRounds never decreases', async () => {
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 78125n);
        let data = await teamVesting.getTeamVestingData();
        expect(data.unlockedRounds).toBe(5);

        // feed a lower price
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 12500n);
        data = await teamVesting.getTeamVestingData();
        expect(data.unlockedRounds).toBe(5);
        expect(data.currentPrice).toBe(12500n);

        // feed an even lower price
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 0n);
        data = await teamVesting.getTeamVestingData();
        expect(data.unlockedRounds).toBe(5);
    });

    it('getTeamVestingRound rejects invalid round with 4204', async () => {
        // round 0
        try {
            await teamVesting.getTeamVestingRound(0);
            fail('expected error');
        } catch (e: any) {
            expect(e.message).toContain('4204');
        }
    });

    it('getTeamVestingRound returns unlocked=0 for locked rounds', async () => {
        // only round 1 initially
        const r2 = await teamVesting.getTeamVestingRound(2);
        expect(r2.unlocked).toBe(0);

        const r10 = await teamVesting.getTeamVestingRound(10);
        expect(r10.unlocked).toBe(0);
    });

    it('round after unlock shows unlocked=1', async () => {
        await teamVesting.sendFeedPrice(admin.getSender(), toNano('0.05'), 5000n);
        const r2 = await teamVesting.getTeamVestingRound(2);
        expect(r2.unlocked).toBe(1);

        const r3 = await teamVesting.getTeamVestingRound(3);
        expect(r3.unlocked).toBe(0);
    });
});

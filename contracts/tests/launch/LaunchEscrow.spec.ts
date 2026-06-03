import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import { LaunchEscrow } from '../../wrappers/LaunchEscrow';
import { ProjectToken } from '../../wrappers/ProjectToken';
import { SimpleLaunchCampaign } from '../../wrappers/SimpleLaunchCampaign';
import { compileActonCode } from '../helpers/actonArtifacts';
import '@ton/test-utils';

const STATE_FUNDING = 1;
const STATE_SUCCESS = 2;
const STATE_FAILED = 3;
const TOKEN = 1_000_000_000n;

describe('LaunchEscrow v1', () => {
    let campaignCode: Cell;
    let escrowCode: Cell;
    let tokenCode: Cell;
    let walletCode: Cell;
    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let team: SandboxContract<TreasuryContract>;
    let platform: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let user3: SandboxContract<TreasuryContract>;
    let user4: SandboxContract<TreasuryContract>;
    let user5: SandboxContract<TreasuryContract>;
    let stranger: SandboxContract<TreasuryContract>;
    let campaign: SandboxContract<SimpleLaunchCampaign>;
    let escrow: SandboxContract<LaunchEscrow>;

    beforeAll(() => {
        campaignCode = compileActonCode('simple_launch_campaign');
        escrowCode = compileActonCode('launch_escrow');
        tokenCode = compileActonCode('project_token');
        walletCode = compileActonCode('project_token_wallet');
    });

    async function deployPair(opts: { minTotal?: bigint; endTime?: number } = {}) {
        blockchain = await Blockchain.create();
        owner = await blockchain.treasury('owner');
        team = await blockchain.treasury('team');
        platform = await blockchain.treasury('platform');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');
        user3 = await blockchain.treasury('user3');
        user4 = await blockchain.treasury('user4');
        user5 = await blockchain.treasury('user5');
        stranger = await blockchain.treasury('stranger');

        const endTime = opts.endTime ?? Math.floor(Date.now() / 1000) + 3600;
        campaign = blockchain.openContract(SimpleLaunchCampaign.createFromConfig({
            projectOwner: owner.address,
            teamWallet: team.address,
            platformFund: platform.address,
            escrowAddress: owner.address,
            tokenAddress: owner.address,
            targetRaiseTon: toNano('50'),
            hardCapTon: toNano('50'),
            minContributionTon: toNano('10'),
            minParticipants: 5,
            minTotalRaiseTon: opts.minTotal ?? toNano('50'),
            endTime,
            platformFeeBps: 350,
            state: STATE_FUNDING,
            tokenCode,
            walletCode,
            metadata: beginCell().storeUint(0, 8).endCell(),
        }, campaignCode));

        escrow = blockchain.openContract(LaunchEscrow.createFromConfig({
            campaignAddress: campaign.address,
            projectOwner: owner.address,
            targetRaiseTon: toNano('50'),
            hardCapTon: toNano('50'),
            minContributionTon: toNano('10'),
            minTotalRaiseTon: opts.minTotal ?? toNano('50'),
            endTime,
            state: STATE_FUNDING,
        }, escrowCode));

        await campaign.sendDeploy(owner.getSender(), toNano('0.1'));
        await escrow.sendDeploy(owner.getSender(), toNano('0.2'));
        await campaign.sendSetEscrow(owner.getSender(), toNano('0.05'), escrow.address);
    }

    async function contribute(user: SandboxContract<TreasuryContract>, amount = toNano('10')) {
        return escrow.sendContribute(user.getSender(), amount + toNano('0.2'), amount);
    }

    async function contributeFive() {
        await contribute(user1);
        await contribute(user2);
        await contribute(user3);
        await contribute(user4);
        await contribute(user5);
    }

    it('records contributions and notifies the linked campaign', async () => {
        await deployPair();

        const result = await contribute(user1);
        expect(result.transactions).toHaveTransaction({ from: user1.address, to: escrow.address, success: true });
        expect(result.transactions).toHaveTransaction({ from: escrow.address, to: campaign.address, success: true });

        const escrowRecord = await escrow.getLaunchEscrowContribution(user1.address);
        expect(escrowRecord.contribution).toBe(toNano('10'));
        expect(escrowRecord.refunded).toBe(0);

        const campaignUser = await campaign.getSimpleLaunchUser(user1.address);
        expect(campaignUser.contribution).toBe(toNano('10'));

        const campaignData = await campaign.getSimpleLaunchCampaignData();
        expect(campaignData.totalRaisedTon).toBe(toNano('10'));
        expect(campaignData.participantCount).toBe(1);
    });

    it('enforces min contribution, hard cap, and campaign-only outcome updates', async () => {
        await deployPair();

        const belowMin = await escrow.sendContribute(user1.getSender(), toNano('1.2'), toNano('1'));
        expect(belowMin.transactions).toHaveTransaction({ from: user1.address, to: escrow.address, success: false, exitCode: 6103 });

        await contribute(user1, toNano('40'));
        const overCap = await contribute(user2, toNano('20'));
        expect(overCap.transactions).toHaveTransaction({ from: user2.address, to: escrow.address, success: false, exitCode: 6105 });

        const unauthorized = await escrow.sendMarkSuccess(stranger.getSender(), toNano('0.05'));
        expect(unauthorized.transactions).toHaveTransaction({ from: stranger.address, to: escrow.address, success: false, exitCode: 6107 });
    });

    it('finalizes through campaign, marks escrow success, mints project tokens, and allows owner withdraw', async () => {
        await deployPair();
        await contributeFive();
        await campaign.sendActivateToken(owner.getSender(), toNano('0.2'));
        const finalized = await campaign.sendFinalize(owner.getSender(), toNano('0.3'));

        expect(finalized.transactions).toHaveTransaction({ from: campaign.address, to: escrow.address, success: true });
        expect((await escrow.getLaunchEscrowData()).state).toBe(STATE_SUCCESS);

        const tokenState = await campaign.getSimpleLaunchTokenState();
        const token = blockchain.openContract(ProjectToken.createFromAddress(tokenState.tokenAddress));
        expect((await token.getJettonData()).totalSupply).toBe(50_000_000n * TOKEN);

        await campaign.sendClaimToken(user1.getSender(), toNano('0.2'));
        expect((await token.getJettonData()).totalSupply).toBe(60_000_000n * TOKEN);

        await campaign.sendClaimToken(user2.getSender(), toNano('0.2'));
        await campaign.sendClaimToken(user3.getSender(), toNano('0.2'));
        await campaign.sendClaimToken(user4.getSender(), toNano('0.2'));
        await campaign.sendClaimToken(user5.getSender(), toNano('0.2'));
        const finalTokenData = await token.getJettonData();
        expect(finalTokenData.totalSupply).toBe(100_000_000n * TOKEN);
        expect(finalTokenData.mintable).toBe(0n);

        const withdraw = await escrow.sendWithdraw(owner.getSender(), toNano('0.1'), toNano('50'));
        expect(withdraw.transactions).toHaveTransaction({ from: escrow.address, to: owner.address, success: true });
        expect((await escrow.getLaunchEscrowData()).withdrawnTon).toBe(toNano('50'));

        const refundAfterSuccess = await escrow.sendRefund(user1.getSender(), toNano('0.05'));
        expect(refundAfterSuccess.transactions).toHaveTransaction({ from: user1.address, to: escrow.address, success: false, exitCode: 6111 });
    });

    it('marks escrow failed from campaign failure and refunds each contributor once', async () => {
        await deployPair({ minTotal: toNano('50') });
        await contribute(user1);

        const fail = await campaign.sendMarkFailed(owner.getSender(), toNano('0.1'));
        expect(fail.transactions).toHaveTransaction({ from: campaign.address, to: escrow.address, success: true });
        expect((await escrow.getLaunchEscrowData()).state).toBe(STATE_FAILED);

        const refund = await escrow.sendRefund(user1.getSender(), toNano('0.05'));
        expect(refund.transactions).toHaveTransaction({ from: escrow.address, to: user1.address, success: true });
        expect((await escrow.getLaunchEscrowContribution(user1.address)).refunded).toBe(1);

        const duplicate = await escrow.sendRefund(user1.getSender(), toNano('0.05'));
        expect(duplicate.transactions).toHaveTransaction({ from: user1.address, to: escrow.address, success: false, exitCode: 6113 });
    });
});

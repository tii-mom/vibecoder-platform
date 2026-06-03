import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import { SimpleLaunchCampaign } from '../../wrappers/SimpleLaunchCampaign';
import { compileActonCode } from '../helpers/actonArtifacts';
import '@ton/test-utils';

const STATE_FUNDING = 1;
const STATE_ACTIVATED = 2;
const STATE_FINALIZED = 3;
const STATE_FAILED = 4;
const TOKEN = 1_000_000_000n;

describe('SimpleLaunchCampaign v1', () => {
    let code: Cell;
    let tokenCode: Cell;
    let walletCode: Cell;
    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let team: SandboxContract<TreasuryContract>;
    let platform: SandboxContract<TreasuryContract>;
    let escrow: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let user3: SandboxContract<TreasuryContract>;
    let user4: SandboxContract<TreasuryContract>;
    let user5: SandboxContract<TreasuryContract>;
    let stranger: SandboxContract<TreasuryContract>;
    let campaign: SandboxContract<SimpleLaunchCampaign>;

    beforeAll(() => {
        code = compileActonCode('simple_launch_campaign');
        tokenCode = compileActonCode('project_token');
        walletCode = compileActonCode('project_token_wallet');
    });

    async function deployCampaign(opts: { target?: bigint; hardCap?: bigint; minTotal?: bigint; endTime?: number } = {}) {
        blockchain = await Blockchain.create();
        owner = await blockchain.treasury('owner');
        team = await blockchain.treasury('team');
        platform = await blockchain.treasury('platform');
        escrow = await blockchain.treasury('escrow');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');
        user3 = await blockchain.treasury('user3');
        user4 = await blockchain.treasury('user4');
        user5 = await blockchain.treasury('user5');
        stranger = await blockchain.treasury('stranger');

        campaign = blockchain.openContract(SimpleLaunchCampaign.createFromConfig({
            projectOwner: owner.address,
            teamWallet: team.address,
            platformFund: platform.address,
            escrowAddress: escrow.address,
            tokenAddress: owner.address,
            targetRaiseTon: opts.target ?? toNano('500'),
            hardCapTon: opts.hardCap ?? toNano('500'),
            minContributionTon: toNano('10'),
            minParticipants: 5,
            minTotalRaiseTon: opts.minTotal ?? 0n,
            endTime: opts.endTime ?? Math.floor(Date.now() / 1000) + 3600,
            platformFeeBps: 350,
            state: STATE_FUNDING,
            tokenCode,
            walletCode,
            metadata: beginCell().storeUint(0, 8).endCell(),
        }, code));

        await campaign.sendDeploy(owner.getSender(), toNano('0.05'));
    }

    async function notify(user: SandboxContract<TreasuryContract>, amount: bigint = toNano('10')) {
        return campaign.sendParticipationNotify(escrow.getSender(), toNano('0.05'), {
            user: user.address,
            contribution: amount,
        });
    }

    async function notifyFive(amount: bigint = toNano('10')) {
        await notify(user1, amount);
        await notify(user2, amount);
        await notify(user3, amount);
        await notify(user4, amount);
        await notify(user5, amount);
    }

    it('deploys with configured initial data', async () => {
        await deployCampaign();
        const data = await campaign.getSimpleLaunchCampaignData();
        expect(data.projectOwner.equals(owner.address)).toBe(true);
        expect(data.teamWallet.equals(team.address)).toBe(true);
        expect(data.platformFund.equals(platform.address)).toBe(true);
        expect(data.escrowAddress.equals(escrow.address)).toBe(true);
        expect(data.state).toBe(STATE_FUNDING);
        expect(data.participantCount).toBe(0);
        expect(data.totalRaisedTon).toBe(0n);
    });

    it('accepts only escrow participation notifications and enforces contribution bounds', async () => {
        await deployCampaign({ hardCap: toNano('50') });

        const wrongSender = await campaign.sendParticipationNotify(stranger.getSender(), toNano('0.05'), {
            user: user1.address,
            contribution: toNano('10'),
        });
        expect(wrongSender.transactions).toHaveTransaction({ from: stranger.address, to: campaign.address, success: false, exitCode: 5101 });

        const belowMin = await campaign.sendParticipationNotify(escrow.getSender(), toNano('0.05'), {
            user: user1.address,
            contribution: toNano('1'),
        });
        expect(belowMin.transactions).toHaveTransaction({ from: escrow.address, to: campaign.address, success: false, exitCode: 5103 });

        await notify(user1, toNano('40'));
        const overHardCap = await notify(user2, toNano('20'));
        expect(overHardCap.transactions).toHaveTransaction({ from: escrow.address, to: campaign.address, success: false, exitCode: 5104 });
    });

    it('does not count duplicate participants twice', async () => {
        await deployCampaign();
        await notify(user1, toNano('10'));
        await notify(user1, toNano('20'));

        const data = await campaign.getSimpleLaunchCampaignData();
        expect(data.participantCount).toBe(1);
        expect(data.totalRaisedTon).toBe(toNano('30'));
        const user = await campaign.getSimpleLaunchUser(user1.address);
        expect(user.contribution).toBe(toNano('30'));
    });

    it('requires five unique participants before activation', async () => {
        await deployCampaign();
        await notify(user1);
        await notify(user2);
        await notify(user3);
        await notify(user4);

        const early = await campaign.sendActivateToken(owner.getSender(), toNano('0.1'));
        expect(early.transactions).toHaveTransaction({ from: owner.address, to: campaign.address, success: false, exitCode: 5107 });

        await notify(user5);
        const activate = await campaign.sendActivateToken(owner.getSender(), toNano('0.1'));
        expect(activate.transactions).toHaveTransaction({ from: owner.address, to: campaign.address, success: true });

        const token = await campaign.getSimpleLaunchTokenState();
        expect(token.tokenDeployed).toBe(1);
        expect(token.state).toBe(STATE_ACTIVATED);
        expect(token.tokenAddress.equals(owner.address)).toBe(false);
    });

    it('finalizes under-target distribution and allows one user claim', async () => {
        await deployCampaign({ target: toNano('500'), hardCap: toNano('500'), endTime: Math.floor(Date.now() / 1000) + 10 });
        await notifyFive(toNano('10'));
        await campaign.sendActivateToken(owner.getSender(), toNano('0.1'));

        const tooEarly = await campaign.sendFinalize(owner.getSender(), toNano('0.05'));
        expect(tooEarly.transactions).toHaveTransaction({ from: owner.address, to: campaign.address, success: false, exitCode: 5110 });

        blockchain.now = Math.floor(Date.now() / 1000) + 7200;
        const finalize = await campaign.sendFinalize(owner.getSender(), toNano('0.05'));
        expect(finalize.transactions).toHaveTransaction({ from: owner.address, to: campaign.address, success: true });

        const distribution = await campaign.getSimpleLaunchDistribution();
        expect(distribution.actualUserShare).toBe(5_000_000n * TOKEN);
        expect(distribution.actualTeamShare).toBe(80_000_000n * TOKEN);
        expect(distribution.platformShare).toBe(15_000_000n * TOKEN);

        const allocation = await campaign.getSimpleLaunchUser(user1.address);
        expect(allocation.allocation).toBe(1_000_000n * TOKEN);

        const claim = await campaign.sendClaimToken(user1.getSender(), toNano('0.05'));
        expect(claim.transactions).toHaveTransaction({ from: user1.address, to: campaign.address, success: true });
        expect((await campaign.getSimpleLaunchUser(user1.address)).claimed).toBe(1);

        const duplicate = await campaign.sendClaimToken(user1.getSender(), toNano('0.05'));
        expect(duplicate.transactions).toHaveTransaction({ from: user1.address, to: campaign.address, success: false, exitCode: 5113 });
    });

    it('finalizes full-target distribution after hard cap', async () => {
        await deployCampaign({ target: toNano('50'), hardCap: toNano('50') });
        await notifyFive(toNano('10'));
        await campaign.sendActivateToken(owner.getSender(), toNano('0.1'));
        await campaign.sendFinalize(owner.getSender(), toNano('0.05'));

        const distribution = await campaign.getSimpleLaunchDistribution();
        expect(distribution.actualUserShare).toBe(50_000_000n * TOKEN);
        expect(distribution.actualTeamShare).toBe(35_000_000n * TOKEN);
        expect(distribution.platformShare).toBe(15_000_000n * TOKEN);
    });

    it('can mark funding campaign failed and then rejects claims', async () => {
        await deployCampaign();
        await notify(user1);

        const failed = await campaign.sendMarkFailed(owner.getSender(), toNano('0.05'));
        expect(failed.transactions).toHaveTransaction({ from: owner.address, to: campaign.address, success: true });
        expect((await campaign.getSimpleLaunchCampaignData()).state).toBe(STATE_FAILED);

        const claim = await campaign.sendClaimToken(user1.getSender(), toNano('0.05'));
        expect(claim.transactions).toHaveTransaction({ from: user1.address, to: campaign.address, success: false, exitCode: 5111 });
    });
});

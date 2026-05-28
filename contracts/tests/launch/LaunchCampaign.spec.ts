import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address } from '@ton/core';
import { LaunchCampaign } from '../../wrappers/LaunchCampaign';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('LaunchCampaign', () => {
    let campaignCode: Cell;
    let jettonMasterCode: Cell;
    let jettonWalletCode: Cell;
    let vestingCode: Cell;

    beforeAll(async () => {
        campaignCode = await compile('LaunchCampaign');
        jettonMasterCode = await compile('ProjectToken');
        jettonWalletCode = await compile('ProjectTokenWallet');
        vestingCode = await compile('Vesting');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let oracle: SandboxContract<TreasuryContract>;
    let platform: SandboxContract<TreasuryContract>;
    let investor1: SandboxContract<TreasuryContract>;
    let investor2: SandboxContract<TreasuryContract>;
    let campaign: SandboxContract<LaunchCampaign>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        oracle = await blockchain.treasury('oracle');
        platform = await blockchain.treasury('platform');
        investor1 = await blockchain.treasury('investor1');
        investor2 = await blockchain.treasury('investor2');

        campaign = blockchain.openContract(
            LaunchCampaign.createFromConfig(
                {
                    ownerAddress: deployer.address,
                    targetTotal: toNano('10000'),
                    deployThreshold: toNano('5500'), // 55%
                    deadline: Math.floor(Date.now() / 1000) + 3600,
                    campaignStatus: 1, // FUNDING
                    stage1Target: toNano('3000'),
                    stage1Rate: 100,
                    stage1Bonus: 10, // 10%
                    stage2Target: toNano('6000'),
                    stage2Rate: 80,
                    stage3Rate: 60,
            jettonMasterCode,
            jettonWalletCode,
            vestingCode,
                    oracleAddress: oracle.address,
                    platformAddress: platform.address,
                },
                campaignCode
            )
        );

        const deployResult = await campaign.sendDeploy(deployer.getSender(), toNano('0.05'));
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: campaign.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy campaign with correct initial data', async () => {
        const data = await campaign.getCampaignData();
        expect(data.campaignStatus).toBe(1);
        expect(data.tokenDeployed).toBe(false);
        expect(data.totalRaised).toBe(0n);
        expect(data.proposalCount).toBe(0);
    });

    it('should compute tokens spent correctly based on pricing tiers', async () => {
        // Investor 1 Sparks 2000 TON
        // 2000 TON is inside Stage 1 (< 3000 TON target)
        // Rate: 100 tokens/TON + 10% bonus = 110 tokens/TON
        // Expected tokens: 2000 * 110 = 220000 tokens
        await campaign.sendSpark(investor1.getSender(), toNano('2000'));
        
        const data = await campaign.getCampaignData();
        expect(data.totalRaised).toBe(toNano('2000'));
        
        const record = await campaign.getInvestorRecord(investor1.address);
        expect(record.amountSpent).toBe(toNano('2000'));
        expect(record.tokensLocked).toBe(toNano('220000')); // 220,000 tokens (with 9 decimals)
    });

    it('should auto-deploy and split funds when threshold is crossed', async () => {
        // Investor 1 Sparks 2000 TON (Stage 1)
        await campaign.sendSpark(investor1.getSender(), toNano('2000'));
        
        // Investor 2 Sparks 4000 TON
        // Total raised: 6000 TON (> 5500 TON threshold)
        // Stage 1 remaining target: 1000 TON (at 110 rate) -> 110,000 tokens
        // Stage 2 target: 6000 TON -> 3000 TON portion (at 80 rate) -> 240,000 tokens
        // Expected investor 2 tokens: 110000 + 240000 = 350000 tokens
        const sparkResult = await campaign.sendSpark(investor2.getSender(), toNano('4000'));
        
        const data = await campaign.getCampaignData();
        expect(data.totalRaised).toBe(toNano('6000'));
        expect(data.tokenDeployed).toBe(true);
        expect(data.campaignStatus).toBe(2); // STATUS_SUCCESS
        
        // Verify child contract addresses are set
        expect(data.tokenAddress).not.toBeNull();

        // Verify team 30% released (30% of 6000 TON = 1800 TON)
        expect(sparkResult.transactions).toHaveTransaction({
            from: campaign.address,
            to: deployer.address,
            success: true,
            value: (x) => !!x && x >= toNano('1790') && x <= toNano('1810'),
        });

        // Verify governance remaining (50% of 6000 TON = 3000 TON)
        expect(data.remainingGovernanceFunds).toBe(toNano('3000'));
    });

    it('should support proposals and quadratic voting weight calculation', async () => {
        // Spark to cross threshold and trigger success
        await campaign.sendSpark(investor1.getSender(), toNano('2000')); // 220000 tokens (weight = sqrt(220000) = 469)
        await campaign.sendSpark(investor2.getSender(), toNano('4000')); // 350000 tokens (weight = sqrt(350000) = 591)
        
        const data = await campaign.getCampaignData();
        
        // 1. Submit proposal (only campaign owner/deployer)
        await campaign.sendSubmitWithdrawal(deployer.getSender(), toNano('0.1'), {
            amount: toNano('500'),
            purpose: 'Server scaling and security audit',
        });
        
        const dataAfterProp = await campaign.getCampaignData();
        expect(dataAfterProp.proposalCount).toBe(1);
        
        // 2. Vote on proposal
        // Investor 1 votes YES
        await campaign.sendVote(investor1.getSender(), toNano('0.1'), {
            proposalId: 1,
            approve: true,
        });

        // 3. Settle proposal (will be approved if yes votes pass threshold)
        const settleResult = await campaign.sendSettleProposal(investor1.getSender(), toNano('0.1'), 1);
        
        // Settle transaction should succeed and release 500 TON to deployer
        expect(settleResult.transactions).toHaveTransaction({
            from: campaign.address,
            to: deployer.address,
            success: true,
            value: (x) => !!x && x >= toNano('500'),
        });
    });
});

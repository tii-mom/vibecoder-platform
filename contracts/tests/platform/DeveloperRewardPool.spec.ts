import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, contractAddress, toNano } from '@ton/core';
import { DeveloperRewardPool } from '../../wrappers/DeveloperRewardPool';
import '@ton/test-utils';
import { compileActonCode } from '../helpers/actonArtifacts';

function calculateJettonWalletAddress(owner: Address, master: Address, walletCode: Cell): Address {
    const data = beginCell()
        .storeCoins(0)
        .storeAddress(owner)
        .storeAddress(master)
        .storeRef(walletCode)
        .endCell();
    return contractAddress(0, { code: walletCode, data });
}

describe('DeveloperRewardPool v1', () => {
    let code: Cell;
    let walletCode: Cell;
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let creator: SandboxContract<TreasuryContract>;
    let nonCreator: SandboxContract<TreasuryContract>;
    let project: SandboxContract<TreasuryContract>;
    let project2: SandboxContract<TreasuryContract>;
    let vcMaster: SandboxContract<TreasuryContract>;
    let pool: SandboxContract<DeveloperRewardPool>;

    beforeAll(async () => {
        code = compileActonCode('developer_reward_pool');
        walletCode = compileActonCode('project_token_wallet');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        creator = await blockchain.treasury('creator');
        nonCreator = await blockchain.treasury('nonCreator');
        project = await blockchain.treasury('project');
        project2 = await blockchain.treasury('project2');
        vcMaster = await blockchain.treasury('vcMaster');

        pool = blockchain.openContract(DeveloperRewardPool.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: admin.address,
            poolAmount: toNano('100000000'),
        }, code));

        await pool.sendDeploy(admin.getSender(), toNano('0.05'));
    });

    it('deploys with computed self VC wallet and pool cap', async () => {
        const data = await pool.getDeveloperPoolData();
        expect(data.adminAddress.equals(admin.address)).toBe(true);
        expect(data.vcMasterAddress.equals(vcMaster.address)).toBe(true);
        expect(data.myVcWalletAddress.equals(calculateJettonWalletAddress(pool.address, vcMaster.address, walletCode))).toBe(true);
        expect(data.remaining).toBe(toNano('100000000'));
        expect(data.totalClaimed).toBe(0n);
        expect(data.projectCount).toBe(0);
    });

    it('requires admin and at least five participants before registering success', async () => {
        const nonAdmin = await pool.sendRegisterProject(creator.getSender(), toNano('0.05'), {
            project: project.address,
            creator: creator.address,
            participants: 5,
        });
        expect(nonAdmin.transactions).toHaveTransaction({ from: creator.address, to: pool.address, success: false });

        const tooFew = await pool.sendRegisterProject(admin.getSender(), toNano('0.05'), {
            project: project.address,
            creator: creator.address,
            participants: 4,
        });
        expect(tooFew.transactions).toHaveTransaction({ from: admin.address, to: pool.address, success: false });
    });

    it('allows creator to claim 5,000 VC once', async () => {
        await pool.sendRegisterProject(admin.getSender(), toNano('0.05'), {
            project: project.address,
            creator: creator.address,
            participants: 5,
        });

        const nonCreatorClaim = await pool.sendClaim(nonCreator.getSender(), toNano('0.05'), project.address);
        expect(nonCreatorClaim.transactions).toHaveTransaction({ from: nonCreator.address, to: pool.address, success: false });

        const claim = await pool.sendClaim(creator.getSender(), toNano('0.05'), project.address);
        expect(claim.transactions).toHaveTransaction({ from: creator.address, to: pool.address, success: true });
        const data = await pool.getDeveloperPoolData();
        expect(data.remaining).toBe(toNano('99995000'));
        expect(data.totalClaimed).toBe(toNano('5000'));
        expect((await pool.getProjectDeveloperReward(project.address)).claimed).toBe(1);

        const duplicate = await pool.sendClaim(creator.getSender(), toNano('0.05'), project.address);
        expect(duplicate.transactions).toHaveTransaction({ from: creator.address, to: pool.address, success: false });
    });

    it('enforces available pool balance across project claims', async () => {
        pool = blockchain.openContract(DeveloperRewardPool.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: admin.address,
            poolAmount: toNano('5000'),
        }, code));
        await pool.sendDeploy(admin.getSender(), toNano('0.05'));

        await pool.sendRegisterProject(admin.getSender(), toNano('0.05'), {
            project: project.address,
            creator: creator.address,
            participants: 5,
        });
        await pool.sendRegisterProject(admin.getSender(), toNano('0.05'), {
            project: project2.address,
            creator: creator.address,
            participants: 5,
        });

        const firstClaim = await pool.sendClaim(creator.getSender(), toNano('0.05'), project.address);
        expect(firstClaim.transactions).toHaveTransaction({ from: creator.address, to: pool.address, success: true });

        const secondClaim = await pool.sendClaim(creator.getSender(), toNano('0.05'), project2.address);
        expect(secondClaim.transactions).toHaveTransaction({ from: creator.address, to: pool.address, success: false });

        const data = await pool.getDeveloperPoolData();
        expect(data.remaining).toBe(0n);
        expect(data.totalClaimed).toBe(toNano('5000'));
    });

    it('restricts admin-only VC withdrawal operation', async () => {
        const nonAdmin = await pool.sendWithdrawVc(nonCreator.getSender(), toNano('0.05'), {
            amount: toNano('1'),
            destination: nonCreator.address,
        });
        expect(nonAdmin.transactions).toHaveTransaction({ from: nonCreator.address, to: pool.address, success: false });

        const adminWithdraw = await pool.sendWithdrawVc(admin.getSender(), toNano('0.05'), {
            amount: toNano('1'),
            destination: admin.address,
        });
        expect(adminWithdraw.transactions).toHaveTransaction({ from: admin.address, to: pool.address, success: true });
    });
});

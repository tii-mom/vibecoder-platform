import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, contractAddress, toNano } from '@ton/core';
import { EcosystemRewardPool } from '../../wrappers/EcosystemRewardPool';
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

describe('EcosystemRewardPool v1', () => {
    let code: Cell;
    let walletCode: Cell;
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let nonAdmin: SandboxContract<TreasuryContract>;
    let project: SandboxContract<TreasuryContract>;
    let project2: SandboxContract<TreasuryContract>;
    let vcMaster: SandboxContract<TreasuryContract>;
    let pool: SandboxContract<EcosystemRewardPool>;

    beforeAll(async () => {
        code = compileActonCode('ecosystem_reward_pool');
        walletCode = compileActonCode('project_token_wallet');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        user = await blockchain.treasury('user');
        nonAdmin = await blockchain.treasury('nonAdmin');
        project = await blockchain.treasury('project');
        project2 = await blockchain.treasury('project2');
        vcMaster = await blockchain.treasury('vcMaster');

        pool = blockchain.openContract(EcosystemRewardPool.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: admin.address,
            poolAmount: toNano('100000000'),
        }, code));

        await pool.sendDeploy(admin.getSender(), toNano('0.05'));
    });

    it('deploys with computed self VC wallet and initial unlock state', async () => {
        const data = await pool.getEcosystemPoolData();
        expect(data.myVcWalletAddress.equals(calculateJettonWalletAddress(pool.address, vcMaster.address, walletCode))).toBe(true);
        expect(data.remaining).toBe(toNano('100000000'));
        expect(data.totalAllocated).toBe(0n);
        expect(data.unlockedRounds).toBe(0);
    });

    it('records allocation at 1 TON = 1,000 VC and caps users at 100,000 VC', async () => {
        await pool.sendRecordAllocation(admin.getSender(), toNano('0.05'), {
            project: project.address,
            user: user.address,
            tonAmount: toNano('200'),
        });

        const allocation = await pool.getUserEcosystemAllocation(project.address, user.address);
        expect(allocation.totalAllocation).toBe(toNano('100000'));

        const duplicate = await pool.sendRecordAllocation(admin.getSender(), toNano('0.05'), {
            project: project.address,
            user: user.address,
            tonAmount: toNano('1'),
        });
        expect(duplicate.transactions).toHaveTransaction({ from: admin.address, to: pool.address, success: false });
    });

    it('restricts allocation and price feed to admin', async () => {
        const record = await pool.sendRecordAllocation(nonAdmin.getSender(), toNano('0.05'), {
            project: project.address,
            user: user.address,
            tonAmount: toNano('1'),
        });
        expect(record.transactions).toHaveTransaction({ from: nonAdmin.address, to: pool.address, success: false });

        const feed = await pool.sendFeedPrice(nonAdmin.getSender(), toNano('0.05'), 12500n);
        expect(feed.transactions).toHaveTransaction({ from: nonAdmin.address, to: pool.address, success: false });
    });

    it('claims immediate 20% and four unlock rounds monotonically', async () => {
        await pool.sendRecordAllocation(admin.getSender(), toNano('0.05'), {
            project: project.address,
            user: user.address,
            tonAmount: toNano('10'),
        });

        const first = await pool.sendClaim(user.getSender(), toNano('0.05'), project.address);
        expect(first.transactions).toHaveTransaction({ from: user.address, to: pool.address, success: true });

        let allocation = await pool.getUserEcosystemAllocation(project.address, user.address);
        expect(allocation.totalAllocation).toBe(toNano('10000'));
        expect(allocation.claimed).toBe(toNano('2000'));

        const duplicate = await pool.sendClaim(user.getSender(), toNano('0.05'), project.address);
        expect(duplicate.transactions).toHaveTransaction({ from: user.address, to: pool.address, success: false });

        await pool.sendFeedPrice(admin.getSender(), toNano('0.05'), 12500n);
        let state = await pool.getEcosystemUnlockState();
        expect(state.unlockedRounds).toBe(1);
        await pool.sendClaim(user.getSender(), toNano('0.05'), project.address);
        allocation = await pool.getUserEcosystemAllocation(project.address, user.address);
        expect(allocation.claimed).toBe(toNano('4000'));

        await pool.sendFeedPrice(admin.getSender(), toNano('0.05'), 78125n);
        state = await pool.getEcosystemUnlockState();
        expect(state.unlockedRounds).toBe(2);

        const reduce = await pool.sendFeedPrice(admin.getSender(), toNano('0.05'), 12500n);
        expect(reduce.transactions).toHaveTransaction({ from: admin.address, to: pool.address, success: false });

        await pool.sendClaim(user.getSender(), toNano('0.05'), project.address);
        allocation = await pool.getUserEcosystemAllocation(project.address, user.address);
        expect(allocation.claimed).toBe(toNano('6000'));

        await pool.sendFeedPrice(admin.getSender(), toNano('0.05'), 488281n);
        state = await pool.getEcosystemUnlockState();
        expect(state.unlockedRounds).toBe(3);
        await pool.sendClaim(user.getSender(), toNano('0.05'), project.address);
        allocation = await pool.getUserEcosystemAllocation(project.address, user.address);
        expect(allocation.claimed).toBe(toNano('8000'));

        await pool.sendFeedPrice(admin.getSender(), toNano('0.05'), 3051758n);
        state = await pool.getEcosystemUnlockState();
        expect(state.unlockedRounds).toBe(4);
        await pool.sendClaim(user.getSender(), toNano('0.05'), project.address);
        allocation = await pool.getUserEcosystemAllocation(project.address, user.address);
        expect(allocation.claimed).toBe(toNano('10000'));

        const finalDuplicate = await pool.sendClaim(user.getSender(), toNano('0.05'), project.address);
        expect(finalDuplicate.transactions).toHaveTransaction({ from: user.address, to: pool.address, success: false });
    });

    it('enforces available pool balance before paying claims', async () => {
        pool = blockchain.openContract(EcosystemRewardPool.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: admin.address,
            poolAmount: toNano('1000'),
        }, code));
        await pool.sendDeploy(admin.getSender(), toNano('0.05'));

        await pool.sendRecordAllocation(admin.getSender(), toNano('0.05'), {
            project: project.address,
            user: user.address,
            tonAmount: toNano('5'),
        });
        await pool.sendRecordAllocation(admin.getSender(), toNano('0.05'), {
            project: project2.address,
            user: user.address,
            tonAmount: toNano('5'),
        });

        const first = await pool.sendClaim(user.getSender(), toNano('0.05'), project.address);
        expect(first.transactions).toHaveTransaction({ from: user.address, to: pool.address, success: true });

        const second = await pool.sendClaim(user.getSender(), toNano('0.05'), project2.address);
        expect(second.transactions).toHaveTransaction({ from: user.address, to: pool.address, success: false });

        const data = await pool.getEcosystemPoolData();
        expect(data.remaining).toBe(0n);
        expect(data.totalClaimed).toBe(toNano('1000'));
    });
});

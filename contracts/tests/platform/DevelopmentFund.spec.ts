import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, contractAddress, toNano } from '@ton/core';
import { DevelopmentFund } from '../../wrappers/DevelopmentFund';
import '@ton/test-utils';
import { compileActonCode } from '../helpers/actonArtifacts';

function calculateJettonWalletAddress(owner: Address, master: Address, walletCode: Cell): Address {
    const data = beginCell().storeCoins(0).storeAddress(owner).storeAddress(master).storeRef(walletCode).endCell();
    return contractAddress(0, { code: walletCode, data });
}

describe('DevelopmentFund v1', () => {
    let code: Cell;
    let walletCode: Cell;
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let nonAdmin: SandboxContract<TreasuryContract>;
    let destination: SandboxContract<TreasuryContract>;
    let destination2: SandboxContract<TreasuryContract>;
    let vcMaster: SandboxContract<TreasuryContract>;
    let fund: SandboxContract<DevelopmentFund>;

    beforeAll(async () => {
        code = compileActonCode('development_fund');
        walletCode = compileActonCode('project_token_wallet');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        nonAdmin = await blockchain.treasury('nonAdmin');
        destination = await blockchain.treasury('destination');
        destination2 = await blockchain.treasury('destination2');
        vcMaster = await blockchain.treasury('vcMaster');

        fund = blockchain.openContract(DevelopmentFund.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: admin.address,
            poolAmount: toNano('100000000'),
        }, code));

        await fund.sendDeploy(admin.getSender(), toNano('0.05'));
    });

    it('deploys with computed self VC wallet', async () => {
        const data = await fund.getDevelopmentFundData();
        expect(data.myVcWalletAddress.equals(calculateJettonWalletAddress(fund.address, vcMaster.address, walletCode))).toBe(true);
        expect(data.remaining).toBe(toNano('100000000'));
        expect(data.recordCount).toBe(0);
    });

    it('requires admin allowlist before investment and records transfer purpose', async () => {
        const nonAdminAdd = await fund.sendAddDestination(nonAdmin.getSender(), toNano('0.05'), destination.address);
        expect(nonAdminAdd.transactions).toHaveTransaction({ from: nonAdmin.address, to: fund.address, success: false });

        const nonAdminInvest = await fund.sendInvest(nonAdmin.getSender(), toNano('0.05'), {
            destination: destination.address,
            amount: toNano('1000'),
            purposeHash: 123n,
        });
        expect(nonAdminInvest.transactions).toHaveTransaction({ from: nonAdmin.address, to: fund.address, success: false });

        const blocked = await fund.sendInvest(admin.getSender(), toNano('0.05'), {
            destination: destination.address,
            amount: toNano('1000'),
            purposeHash: 123n,
        });
        expect(blocked.transactions).toHaveTransaction({ from: admin.address, to: fund.address, success: false });

        await fund.sendAddDestination(admin.getSender(), toNano('0.05'), destination.address);
        expect(await fund.isAllowedDestination(destination.address)).toBe(1);

        const invest = await fund.sendInvest(admin.getSender(), toNano('0.05'), {
            destination: destination.address,
            amount: toNano('1000'),
            purposeHash: 123n,
        });
        expect(invest.transactions).toHaveTransaction({ from: admin.address, to: fund.address, success: true });

        const data = await fund.getDevelopmentFundData();
        expect(data.remaining).toBe(toNano('99999000'));
        expect(data.totalDisbursed).toBe(toNano('1000'));
        expect(data.recordCount).toBe(1);

        const record = await fund.getInvestmentRecord(1);
        expect(record.amount).toBe(toNano('1000'));
        expect(record.purposeHash).toBe(123n);
    });

    it('allows admin to remove an allowlisted destination', async () => {
        await fund.sendAddDestination(admin.getSender(), toNano('0.05'), destination.address);
        expect(await fund.isAllowedDestination(destination.address)).toBe(1);

        const nonAdminRemove = await fund.sendRemoveDestination(nonAdmin.getSender(), toNano('0.05'), destination.address);
        expect(nonAdminRemove.transactions).toHaveTransaction({ from: nonAdmin.address, to: fund.address, success: false });
        expect(await fund.isAllowedDestination(destination.address)).toBe(1);

        const remove = await fund.sendRemoveDestination(admin.getSender(), toNano('0.05'), destination.address);
        expect(remove.transactions).toHaveTransaction({ from: admin.address, to: fund.address, success: true });
        expect(await fund.isAllowedDestination(destination.address)).toBe(0);

        const blocked = await fund.sendInvest(admin.getSender(), toNano('0.05'), {
            destination: destination.address,
            amount: toNano('1000'),
            purposeHash: 456n,
        });
        expect(blocked.transactions).toHaveTransaction({ from: admin.address, to: fund.address, success: false });
    });

    it('enforces remaining pool cap across investments', async () => {
        fund = blockchain.openContract(DevelopmentFund.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: admin.address,
            poolAmount: toNano('1000'),
        }, code));
        await fund.sendDeploy(admin.getSender(), toNano('0.05'));

        await fund.sendAddDestination(admin.getSender(), toNano('0.05'), destination.address);
        await fund.sendAddDestination(admin.getSender(), toNano('0.05'), destination2.address);

        const first = await fund.sendInvest(admin.getSender(), toNano('0.05'), {
            destination: destination.address,
            amount: toNano('1000'),
            purposeHash: 1n,
        });
        expect(first.transactions).toHaveTransaction({ from: admin.address, to: fund.address, success: true });

        const second = await fund.sendInvest(admin.getSender(), toNano('0.05'), {
            destination: destination2.address,
            amount: toNano('1'),
            purposeHash: 2n,
        });
        expect(second.transactions).toHaveTransaction({ from: admin.address, to: fund.address, success: false });

        const data = await fund.getDevelopmentFundData();
        expect(data.remaining).toBe(0n);
        expect(data.totalDisbursed).toBe(toNano('1000'));
        expect(data.recordCount).toBe(1);
    });
});

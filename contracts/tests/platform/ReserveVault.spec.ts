import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, contractAddress, toNano } from '@ton/core';
import { ReserveVault } from '../../wrappers/ReserveVault';
import '@ton/test-utils';
import { compileActonCode } from '../helpers/actonArtifacts';

function calculateJettonWalletAddress(owner: Address, master: Address, walletCode: Cell): Address {
    const data = beginCell().storeCoins(0).storeAddress(owner).storeAddress(master).storeRef(walletCode).endCell();
    return contractAddress(0, { code: walletCode, data });
}

describe('ReserveVault v1', () => {
    let code: Cell;
    let walletCode: Cell;
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let nonAdmin: SandboxContract<TreasuryContract>;
    let destination: SandboxContract<TreasuryContract>;
    let destination2: SandboxContract<TreasuryContract>;
    let vcMaster: SandboxContract<TreasuryContract>;
    let vault: SandboxContract<ReserveVault>;

    beforeAll(async () => {
        code = compileActonCode('reserve_vault');
        walletCode = compileActonCode('project_token_wallet');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        nonAdmin = await blockchain.treasury('nonAdmin');
        destination = await blockchain.treasury('destination');
        destination2 = await blockchain.treasury('destination2');
        vcMaster = await blockchain.treasury('vcMaster');

        vault = blockchain.openContract(ReserveVault.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: admin.address,
            poolAmount: toNano('100000000'),
        }, code));

        await vault.sendDeploy(admin.getSender(), toNano('0.05'));
    });

    it('deploys with computed self VC wallet', async () => {
        const data = await vault.getReserveVaultData();
        expect(data.myVcWalletAddress.equals(calculateJettonWalletAddress(vault.address, vcMaster.address, walletCode))).toBe(true);
        expect(data.remaining).toBe(toNano('100000000'));
        expect(data.transferCount).toBe(0);
    });

    it('allows admin transfer to wallet or contract and records purpose hash', async () => {
        const nonAdminTransfer = await vault.sendTransfer(nonAdmin.getSender(), toNano('0.05'), {
            destination: destination.address,
            amount: toNano('1000'),
            purposeHash: 456n,
        });
        expect(nonAdminTransfer.transactions).toHaveTransaction({ from: nonAdmin.address, to: vault.address, success: false });

        const transfer = await vault.sendTransfer(admin.getSender(), toNano('0.05'), {
            destination: destination.address,
            amount: toNano('1000'),
            purposeHash: 456n,
        });
        expect(transfer.transactions).toHaveTransaction({ from: admin.address, to: vault.address, success: true });

        const data = await vault.getReserveVaultData();
        expect(data.remaining).toBe(toNano('99999000'));
        expect(data.totalTransferred).toBe(toNano('1000'));
        expect(data.transferCount).toBe(1);

        const record = await vault.getReserveTransferRecord(1);
        expect(record.amount).toBe(toNano('1000'));
        expect(record.purposeHash).toBe(456n);
    });

    it('rejects zero amount and transfers beyond remaining cap', async () => {
        const zero = await vault.sendTransfer(admin.getSender(), toNano('0.05'), {
            destination: destination.address,
            amount: 0n,
            purposeHash: 1n,
        });
        expect(zero.transactions).toHaveTransaction({ from: admin.address, to: vault.address, success: false });

        vault = blockchain.openContract(ReserveVault.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: admin.address,
            poolAmount: toNano('1000'),
        }, code));
        await vault.sendDeploy(admin.getSender(), toNano('0.05'));

        const first = await vault.sendTransfer(admin.getSender(), toNano('0.05'), {
            destination: destination.address,
            amount: toNano('1000'),
            purposeHash: 2n,
        });
        expect(first.transactions).toHaveTransaction({ from: admin.address, to: vault.address, success: true });

        const second = await vault.sendTransfer(admin.getSender(), toNano('0.05'), {
            destination: destination2.address,
            amount: toNano('1'),
            purposeHash: 3n,
        });
        expect(second.transactions).toHaveTransaction({ from: admin.address, to: vault.address, success: false });

        const data = await vault.getReserveVaultData();
        expect(data.remaining).toBe(0n);
        expect(data.totalTransferred).toBe(toNano('1000'));
        expect(data.transferCount).toBe(1);
    });
});

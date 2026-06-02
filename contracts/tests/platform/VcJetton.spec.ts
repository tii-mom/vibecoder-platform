import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, contractAddress, toNano } from '@ton/core';
import { VcJetton } from '../../wrappers/VcJetton';
import '@ton/test-utils';
import { compileActonCode } from '../helpers/actonArtifacts';

function contentCell(uri: string): Cell {
    return beginCell().storeUint(1, 8).storeBuffer(Buffer.from(uri, 'utf8')).endCell();
}

function calculateJettonWalletAddress(owner: Address, master: Address, walletCode: Cell): Address {
    const data = beginCell()
        .storeCoins(0)
        .storeAddress(owner)
        .storeAddress(master)
        .storeRef(walletCode)
        .endCell();

    return contractAddress(0, { code: walletCode, data });
}

describe('VcJetton standard compatibility', () => {
    let vcCode: Cell;
    let walletCode: Cell;
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let owner: SandboxContract<TreasuryContract>;
    let vcJetton: SandboxContract<VcJetton>;

    beforeAll(async () => {
        vcCode = compileActonCode('vc_jetton');
        walletCode = compileActonCode('project_token_wallet');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        owner = await blockchain.treasury('owner');

        vcJetton = blockchain.openContract(VcJetton.createFromConfig({
            adminAddress: admin.address,
            content: contentCell('https://example.com/vc.json'),
            jettonWalletCode: walletCode,
        }, vcCode));

        const deployResult = await vcJetton.sendDeploy(admin.getSender(), toNano('0.05'));
        expect(deployResult.transactions).toHaveTransaction({
            from: admin.address,
            to: vcJetton.address,
            deploy: true,
            success: true,
        });
    });

    it('exposes TEP-74 snake_case master get-methods', async () => {
        const data = await blockchain.runGetMethod(vcJetton.address, 'get_jetton_data', []);
        expect(data.exitCode).toBe(0);
        expect(data.stackReader.readBigNumber()).toBe(0n);
        expect(data.stackReader.readBigNumber()).toBe(-1n);
        expect(data.stackReader.readAddress().equals(admin.address)).toBe(true);

        const wallet = await blockchain.runGetMethod(vcJetton.address, 'get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(owner.address).endCell() },
        ]);
        expect(wallet.exitCode).toBe(0);
        expect(wallet.stackReader.readAddress().equals(calculateJettonWalletAddress(owner.address, vcJetton.address, walletCode))).toBe(true);
    });

    it('exposes TEP-74 snake_case wallet get-method after mint', async () => {
        const mintResult = await vcJetton.sendMint(admin.getSender(), toNano('0.2'), {
            toAddress: owner.address,
            amount: toNano('10002'),
        });
        const wallet = calculateJettonWalletAddress(owner.address, vcJetton.address, walletCode);

        expect(mintResult.transactions).toHaveTransaction({
            from: vcJetton.address,
            to: wallet,
            success: true,
        });

        const walletData = await blockchain.runGetMethod(wallet, 'get_wallet_data', []);
        expect(walletData.exitCode).toBe(0);
        expect(walletData.stackReader.readBigNumber()).toBe(toNano('10002'));
        expect(walletData.stackReader.readAddress().equals(owner.address)).toBe(true);
        expect(walletData.stackReader.readAddress().equals(vcJetton.address)).toBe(true);
    });
});

import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, contractAddress, toNano } from '@ton/core';
import { ProjectToken } from '../../wrappers/ProjectToken';
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

describe('ProjectToken', () => {
    let code: Cell;
    let walletCode: Cell;

    beforeAll(async () => {
        code = compileActonCode('project_token');
        walletCode = compileActonCode('project_token_wallet');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let owner: SandboxContract<TreasuryContract>;
    let projectToken: SandboxContract<ProjectToken>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        owner = await blockchain.treasury('owner');

        projectToken = blockchain.openContract(ProjectToken.createFromConfig({
            adminAddress: deployer.address,
            maxSupply: toNano('10000'),
            content: contentCell('https://example.com/project-token.json'),
            jettonWalletCode: walletCode,
        }, code));

        const deployResult = await projectToken.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: projectToken.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {});

    it('exposes TEP-74 snake_case master get-methods with mintable', async () => {
        const data = await blockchain.runGetMethod(projectToken.address, 'get_jetton_data', []);
        expect(data.exitCode).toBe(0);
        expect(data.stackReader.readBigNumber()).toBe(0n);
        expect(data.stackReader.readBigNumber()).toBe(-1n);
        expect(data.stackReader.readAddress().equals(deployer.address)).toBe(true);

        const wallet = await blockchain.runGetMethod(projectToken.address, 'get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(owner.address).endCell() },
        ]);
        expect(wallet.exitCode).toBe(0);
        expect(wallet.stackReader.readAddress().equals(calculateJettonWalletAddress(owner.address, projectToken.address, walletCode))).toBe(true);
    });

    it('allows admin mint within maxSupply', async () => {
        const mintResult = await projectToken.sendMint(deployer.getSender(), toNano('0.2'), {
            toAddress: owner.address,
            amount: toNano('1234'),
        });

        expect(mintResult.transactions).toHaveTransaction({
            from: projectToken.address,
            to: calculateJettonWalletAddress(owner.address, projectToken.address, walletCode),
            success: true,
        });

        const data = await blockchain.runGetMethod(projectToken.address, 'get_jetton_data', []);
        expect(data.stackReader.readBigNumber()).toBe(toNano('1234'));
    });

    it('rejects mint exceeding maxSupply', async () => {
        const res = await projectToken.sendMint(deployer.getSender(), toNano('0.2'), {
            toAddress: owner.address,
            amount: toNano('20000'),
        });

        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: projectToken.address,
            success: false,
            exitCode: 706,
        });
    });

    it('rejects non-admin mint', async () => {
        const attacker = await blockchain.treasury('attacker');
        const res = await projectToken.sendMint(attacker.getSender(), toNano('0.2'), {
            toAddress: owner.address,
            amount: toNano('100'),
        });

        expect(res.transactions).toHaveTransaction({
            from: attacker.address,
            to: projectToken.address,
            success: false,
            exitCode: 701,
        });
    });

    it('allows admin to disable mint', async () => {
        const res = await projectToken.sendDisableMint(deployer.getSender(), toNano('0.1'));
        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: projectToken.address,
            success: true,
        });
    });

    it('rejects mint after mint disabled', async () => {
        await projectToken.sendDisableMint(deployer.getSender(), toNano('0.1'));
        const res = await projectToken.sendMint(deployer.getSender(), toNano('0.2'), {
            toAddress: owner.address,
            amount: toNano('100'),
        });

        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: projectToken.address,
            success: false,
            exitCode: 705,
        });
    });

    it('get_jetton_data returns mintable=0 after disable', async () => {
        await projectToken.sendDisableMint(deployer.getSender(), toNano('0.1'));
        const data = await blockchain.runGetMethod(projectToken.address, 'get_jetton_data', []);
        expect(data.exitCode).toBe(0);
        expect(data.stackReader.readBigNumber()).toBe(0n);
        expect(data.stackReader.readBigNumber()).toBe(0n);
    });

    it('rejects non-admin disable mint', async () => {
        const attacker = await blockchain.treasury('attacker');
        const res = await projectToken.sendDisableMint(attacker.getSender(), toNano('0.1'));
        expect(res.transactions).toHaveTransaction({
            from: attacker.address,
            to: projectToken.address,
            success: false,
            exitCode: 701,
        });
    });

    it('exposes TEP-74 snake_case wallet get-method after mint', async () => {
        const mintResult = await projectToken.sendMint(deployer.getSender(), toNano('0.2'), {
            toAddress: owner.address,
            amount: toNano('1234'),
        });
        const wallet = calculateJettonWalletAddress(owner.address, projectToken.address, walletCode);

        expect(mintResult.transactions).toHaveTransaction({
            from: projectToken.address,
            to: wallet,
            success: true,
        });

        const walletData = await blockchain.runGetMethod(wallet, 'get_wallet_data', []);
        expect(walletData.exitCode).toBe(0);
        expect(walletData.stackReader.readBigNumber()).toBe(toNano('1234'));
        expect(walletData.stackReader.readAddress().equals(owner.address)).toBe(true);
        expect(walletData.stackReader.readAddress().equals(projectToken.address)).toBe(true);
    });
});

import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell, Address, contractAddress, internal } from '@ton/core';
import { Fund } from '../../wrappers/Fund';
import '@ton/test-utils';
import { compileActonCode } from '../helpers/actonArtifacts';
import { deployJettonWallet } from '../helpers/jettonWallet';

function calculateJettonWalletAddress(owner: Address, master: Address, walletCode: Cell): Address {
    const data = beginCell()
        .storeCoins(0)
        .storeAddress(owner)
        .storeAddress(master)
        .storeRef(walletCode)
        .endCell();
    const init = { code: walletCode, data };
    return contractAddress(0, init);
}

describe('Fund', () => {
    let fundCode: Cell;
    let walletCode: Cell;

    beforeAll(async () => {
        fundCode = compileActonCode('fund');
        walletCode = compileActonCode('project_token_wallet'); // Use ProjectTokenWallet for testing code
    });

    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let vcMaster: SandboxContract<TreasuryContract>;
    let myWallet: SandboxContract<TreasuryContract>;
    let fund: SandboxContract<Fund>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        vcMaster = await blockchain.treasury('vcMaster');
        myWallet = await blockchain.treasury('myWallet');

        fund = blockchain.openContract(Fund.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: myWallet.address,
        }, fundCode));

        const deployResult = await fund.sendDeploy(admin.getSender(), toNano('0.05'));
        expect(deployResult.transactions).toHaveTransaction({
            from: admin.address,
            to: fund.address,
            deploy: true,
            success: true,
        });
        await deployJettonWallet(blockchain, vcMaster, walletCode, fund.address);
    });

    it('should handle empty body messages securely without admin state corruption', async () => {
        // Send a message with empty body and some TON
        const sender = await blockchain.treasury('sender');
        const res = await sender.send({
            to: fund.address,
            value: toNano('5.0'),
            bounce: true,
            body: beginCell().endCell()
        });

        expect(res.transactions).toHaveTransaction({
            from: sender.address,
            to: fund.address,
            success: true
        });

        // Verify state is preserved and accumulatedTon updated correctly
        const data = await fund.getFundData();
        expect(data.adminAddress.equals(admin.address)).toBe(true);
        expect(data.vcMasterAddress.equals(vcMaster.address)).toBe(true);
        expect(data.myVcWalletAddress.equals(calculateJettonWalletAddress(fund.address, vcMaster.address, walletCode))).toBe(true);
        expect(data.accumulatedTon).toBeGreaterThanOrEqual(toNano('5.0'));
    });

    it('should reject non-wallet transfer notifications', async () => {
        // Send a transfer notification with op 0x7362d09c from a random sender
        const attacker = await blockchain.treasury('attacker');
        const body = beginCell()
            .storeUint(0x7362d09c, 32) // transfer_notification op
            .storeUint(0, 64) // queryId
            .storeCoins(toNano('10.0')) // amount
            .storeAddress(attacker.address) // sender
            .storeMaybeRef(beginCell().storeAddress(vcMaster.address).endCell()) // payload containing tokenMaster in ref
            .endCell();

        const res = await attacker.send({
            to: fund.address,
            value: toNano('0.1'),
            bounce: true,
            body: body
        });

        // Should abort since the sender is not the computed Jetton wallet of the Fund for that token master
        expect(res.transactions).toHaveTransaction({
            from: attacker.address,
            to: fund.address,
            success: false,
            exitCode: 808
        });
    });

    it('should track user VC deposits and allow VC withdrawals', async () => {
        const depositor = await blockchain.treasury('depositor');

        // Compute the expected VC Jetton wallet address of the Fund contract
        const fundVcWalletAddress = calculateJettonWalletAddress(fund.address, vcMaster.address, walletCode);

        // 1. Simulate a transfer notification representing a VC deposit of 150 VC
        const depositAmount = toNano('150.0');
        const depositBody = beginCell()
            .storeUint(0x7362d09c, 32) // transfer_notification
            .storeUint(12345, 64) // queryId
            .storeCoins(depositAmount)
            .storeAddress(depositor.address) // sender_address
            .storeMaybeRef(beginCell().storeAddress(vcMaster.address).endCell()) // tokenMaster in ref
            .endCell();

        const depositMsg = internal({
            to: fund.address,
            value: toNano('0.1'),
            bounce: true,
            body: depositBody
        });

        // Override src address
        depositMsg.info = {
            ...depositMsg.info,
            src: fundVcWalletAddress
        } as any;

        const depositRes = await blockchain.sendMessage(depositMsg as any);

        expect(depositRes.transactions).toHaveTransaction({
            from: fundVcWalletAddress,
            to: fund.address,
            success: true
        });

        // 2. Verify that depositor deposit is updated on-chain
        const userDeposit = await fund.getUserDeposit(depositor.address);
        expect(userDeposit).toEqual(depositAmount);

        // 3. Verify total stats
        const stats = await fund.getFundStats();
        expect(stats.totalUserDeposits).toEqual(depositAmount);

        // 4. Test withdrawal: withdraw 50 VC
        const withdrawAmount = toNano('50.0');
        const withdrawRes = await fund.sendWithdrawUserVC(depositor.getSender(), toNano('0.1'), {
            amount: withdrawAmount
        });

        expect(withdrawRes.transactions).toHaveTransaction({
            from: depositor.address,
            to: fund.address,
            success: true
        });

        // The fund should have sent a transfer message to myWallet to send tokens back
        expect(withdrawRes.transactions).toHaveTransaction({
            from: fund.address,
            to: calculateJettonWalletAddress(fund.address, vcMaster.address, walletCode),
            success: true
        });

        // 5. Verify balances
        const remainingDeposit = await fund.getUserDeposit(depositor.address);
        expect(remainingDeposit).toEqual(depositAmount - withdrawAmount);

        const remainingStats = await fund.getFundStats();
        expect(remainingStats.totalUserDeposits).toEqual(depositAmount - withdrawAmount);

        // 6. Test over-withdrawal: try to withdraw 110 VC (only 100 VC remaining)
        const invalidWithdrawAmount = toNano('110.0');
        const overWithdrawRes = await fund.sendWithdrawUserVC(depositor.getSender(), toNano('0.1'), {
            amount: invalidWithdrawAmount
        });

        expect(overWithdrawRes.transactions).toHaveTransaction({
            from: depositor.address,
            to: fund.address,
            success: false,
            exitCode: 811
        });
    });
});

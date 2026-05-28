import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell, internal } from '@ton/core';
import { LaunchFee } from '../../wrappers/LaunchFee';
import '@ton/test-utils';
import { compileActonCode } from '../helpers/actonArtifacts';
import { deployJettonWallet } from '../helpers/jettonWallet';

describe('LaunchFee', () => {
    let feeCode: Cell;
    let walletCode: Cell;

    beforeAll(async () => {
        feeCode = compileActonCode('launch_fee');
        walletCode = compileActonCode('project_token_wallet');
    });

    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let vcMaster: SandboxContract<TreasuryContract>;
    let myWallet: SandboxContract<TreasuryContract>;
    let feeContract: SandboxContract<LaunchFee>;
    let fund: SandboxContract<TreasuryContract>;

    async function actualMyWallet() {
        return (await feeContract.getLaunchFeeData()).myVcWalletAddress;
    }

    async function sendFrom(address: any, body: Cell, value = toNano('0.1'), bounced = false) {
        const msg = internal({
            to: feeContract.address,
            value,
            bounce: !bounced,
            body
        });

        return blockchain.sendMessage({
            info: {
                ...msg.info,
                src: address,
                type: 'internal',
                bounced
            } as any,
            body: msg.body,
            init: msg.init
        });
    }

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        vcMaster = await blockchain.treasury('vcMaster');
        myWallet = await blockchain.treasury('myWallet');
        fund = await blockchain.treasury('fund');

        feeContract = blockchain.openContract(LaunchFee.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: myWallet.address,
            fundAddress: fund.address,
            deploymentFee: 300000000000n, // 300 VC
            antiSpamStake: 500000000000n, // 500 VC
        }, feeCode));

        const deployResult = await feeContract.sendDeploy(admin.getSender(), toNano('0.05'));
        expect(deployResult.transactions).toHaveTransaction({
            from: admin.address,
            to: feeContract.address,
            deploy: true,
            success: true,
        });
        await deployJettonWallet(blockchain, vcMaster, walletCode, feeContract.address);
    });

    it('should reject transfer notification from non-myWallet sender', async () => {
        const attacker = await blockchain.treasury('attacker');
        const creator = await blockchain.treasury('creator');
        const project = await blockchain.treasury('project');

        // Create standard Jetton notification payload
        const notification = beginCell()
            .storeUint(0x7362d09c, 32) // transfer_notification op
            .storeUint(0, 64) // queryId
            .storeCoins(500000000000n) // jettonAmount (500 VC)
            .storeAddress(creator.address) // senderAddress
            .storeMaybeRef(
                beginCell()
                    .storeUint(1, 32) // OP_STAKE (innerOp)
                    .storeAddress(project.address) // project
                    .endCell()
            )
            .endCell();

        // Send notification directly from attacker (not myWallet)
        const res = await attacker.send({
            to: feeContract.address,
            value: toNano('0.1'),
            bounce: true,
            body: notification
        });

        expect(res.transactions).toHaveTransaction({
            from: attacker.address,
            to: feeContract.address,
            success: false,
            exitCode: 1309 // assert(sender == myWallet, 1309);
        });
    });

    it('should accept transfer notification from myWallet', async () => {
        const creator = await blockchain.treasury('creator');
        const project = await blockchain.treasury('project');

        // Create standard Jetton notification payload
        const notification = beginCell()
            .storeUint(0x7362d09c, 32) // transfer_notification op
            .storeUint(0, 64) // queryId
            .storeCoins(500000000000n) // jettonAmount (500 VC)
            .storeAddress(creator.address) // senderAddress
            .storeMaybeRef(
                beginCell()
                    .storeUint(1, 32) // OP_STAKE (innerOp)
                    .storeAddress(project.address) // project
                    .endCell()
            )
            .endCell();

        const wallet = await actualMyWallet();
        const res = await sendFrom(wallet, notification);

        expect(res.transactions).toHaveTransaction({
            from: wallet,
            to: feeContract.address,
            success: true
        });

        // Verify that the project stake state was created
        const projectStake = await feeContract.getProjectStake(project.address);
        expect(projectStake.staked).toBe(true);
        expect(projectStake.stakedAmount).toBe(500000000000n);
    });

    it('should rollback stake amount if refund Jetton transfer bounces', async () => {
        const creator = await blockchain.treasury('creator');
        const project = await blockchain.treasury('project');

        // 1. Stake 500 VC (notification from myWallet)
        const notification = beginCell()
            .storeUint(0x7362d09c, 32)
            .storeUint(0, 64)
            .storeCoins(500000000000n)
            .storeAddress(creator.address)
            .storeMaybeRef(
                beginCell()
                    .storeUint(1, 32) // OP_STAKE
                    .storeAddress(project.address)
                    .endCell()
            )
            .endCell();

        const wallet = await actualMyWallet();
        await sendFrom(wallet, notification);

        // Verify staked correctly
        let projectStake = await feeContract.getProjectStake(project.address);
        expect(projectStake.stakedAmount).toBe(500000000000n);

        // 2. Refund stake (initiated by admin) with specific query ID
        const queryId = 99999n;
        const refundRes = await feeContract.sendRefundStake(admin.getSender(), toNano('0.1'), project.address, queryId);
        expect(refundRes.transactions).toHaveTransaction({
            from: admin.address,
            to: feeContract.address,
            success: true
        });

        // Verify stake amount is cleared (0) since refund is in flight
        projectStake = await feeContract.getProjectStake(project.address);
        expect(projectStake.stakedAmount).toBe(0n);

        // 3. Simulate a bounced message from the outgoing Jetton transfer
        // The bounced body contains: 32-bit 0xffffffff, then first 256 bits of original body:
        // original body is: 32-bit op (0x0f8a7ea5), 64-bit query_id (queryId), etc.
        const bouncedBody = beginCell()
            .storeUint(0xffffffff, 32) // bounced prefix
            .storeUint(0x0f8a7ea5, 32) // original op (transfer)
            .storeUint(queryId, 64)    // original query ID
            .endCell();

        // Send bounced message from myWallet (sender of the outgoing transfer)
        const msgRelaxed = internal({
            to: feeContract.address,
            value: toNano('0.05'),
            bounce: false,
            body: bouncedBody
        });

        const bounceRes = await blockchain.sendMessage({
            info: {
                ...msgRelaxed.info,
                src: wallet,
                type: 'internal',
                bounced: true
            } as any,
            body: msgRelaxed.body,
            init: msgRelaxed.init
        });

        expect(bounceRes.transactions).toHaveTransaction({
            from: wallet,
            to: feeContract.address,
            success: true
        });

        // 4. Verify that project stake has been restored!
        projectStake = await feeContract.getProjectStake(project.address);
        expect(projectStake.stakedAmount).toBe(500000000000n);
    });

    it('should allow admin to dynamically update fee parameters', async () => {
        const newFund = await blockchain.treasury('newFund');
        const updateRes = await feeContract.sendSetParams(admin.getSender(), toNano('0.1'), {
            deploymentFee: 100000000000n, // 100 VC
            antiSpamStake: 200000000000n, // 200 VC
            fundAddress: newFund.address,
        });

        expect(updateRes.transactions).toHaveTransaction({
            from: admin.address,
            to: feeContract.address,
            success: true
        });

        const params = await feeContract.getLaunchFeeData();
        expect(params.deploymentFee).toBe(100000000000n);
        expect(params.antiSpamStake).toBe(200000000000n);
        expect(params.fundAddress.toString()).toBe(newFund.address.toString());
    });

    it('should forward deployment fee to fund VC wallet on OP_FEE', async () => {
        const creator = await blockchain.treasury('creator');
        const project = await blockchain.treasury('project');

        // First stake 500 VC
        const wallet = await actualMyWallet();
        await sendFrom(wallet, beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(500000000000n)
                .storeAddress(creator.address)
                .storeMaybeRef(beginCell().storeUint(1, 32).storeAddress(project.address).endCell())
                .endCell());

        // Now pay 300 VC deployment fee
        const payRes = await sendFrom(wallet, beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(300000000000n)
                .storeAddress(creator.address)
                .storeMaybeRef(beginCell().storeUint(2, 32).storeAddress(project.address).endCell())
                .endCell(), toNano('0.15'));

        expect(payRes.transactions).toHaveTransaction({
            from: wallet,
            to: feeContract.address,
            success: true
        });

        // Verify forwarding transaction to the Fund's calculated VC wallet
        // Recipient is calculated via calcWallet(fundAddr)
        expect(payRes.transactions).toHaveTransaction({
            from: feeContract.address,
            to: wallet,
            success: true
        });
    });
});

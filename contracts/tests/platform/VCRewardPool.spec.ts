import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, Slice, toNano } from '@ton/core';
import { VCRewardPool } from '../../wrappers/VCRewardPool';
import { compileActonCode } from '../helpers/actonArtifacts';
import { deployJettonWallet } from '../helpers/jettonWallet';
import '@ton/test-utils';

const VC = 1_000_000_000n;
const DEV_POOL = 100_000_000n * VC;
const ECO_POOL = 350_000_000n * VC;
const DEV_REWARD = 10_000n * VC;
const USER_REWARD = 10_000n * VC;

function outgoingJettonAmount(transactions: any[], from: any, to: any): bigint | null {
    for (const tx of transactions) {
        if (tx.inMessage?.info?.src?.equals?.(from) && tx.inMessage?.info?.dest?.equals?.(to)) {
            let body = tx.inMessage.body.beginParse() as Slice;
            if (body.remainingBits < 32 && body.remainingRefs > 0) {
                body = body.loadRef().beginParse() as Slice;
            }
            if (body.remainingBits >= 32 && body.loadUint(32) === 0x0f8a7ea5) {
                body.loadUintBig(64);
                return body.loadCoins();
            }
        }
    }
    return null;
}

describe('VCRewardPool via Acton artifacts', () => {
    let code: Cell;
    let walletCode: Cell;
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let vcMaster: SandboxContract<TreasuryContract>;
    let myWallet: SandboxContract<TreasuryContract>;
    let pool: SandboxContract<VCRewardPool>;

    beforeAll(() => {
        code = compileActonCode('vc_reward_pool');
        walletCode = compileActonCode('project_token_wallet');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        vcMaster = await blockchain.treasury('vcMaster');
        myWallet = await blockchain.treasury('myWallet');

        pool = blockchain.openContract(VCRewardPool.createFromConfig({
            adminAddress: admin.address,
            vcMasterAddress: vcMaster.address,
            vcWalletCode: walletCode,
            myVcWalletAddress: myWallet.address,
            developerPool: DEV_POOL,
            ecosystemPool: ECO_POOL,
        }, code));

        const deploy = await pool.sendDeploy(admin.getSender(), toNano('0.05'));
        expect(deploy.transactions).toHaveTransaction({ from: admin.address, to: pool.address, deploy: true, success: true });
        await deployJettonWallet(blockchain, vcMaster, walletCode, pool.address);
    });

    it('records projects and lets creator claim one developer reward', async () => {
        const creator = await blockchain.treasury('creator');
        const project = await blockchain.treasury('project');

        await pool.sendSetProject(admin.getSender(), toNano('0.05'), {
            project: project.address,
            creator: creator.address,
            participants: 10,
            success: true,
        });

        const claim = await pool.sendClaimDeveloper(creator.getSender(), toNano('0.1'), project.address);
        expect(claim.transactions).toHaveTransaction({ from: creator.address, to: pool.address, success: true });
        expect(outgoingJettonAmount(claim.transactions, pool.address, (await pool.getRewardPoolData()).myVcWalletAddress)).toBe(DEV_REWARD);

        const state = await pool.getProjectRewardState(project.address);
        expect(state.developerClaimed).toBe(1);
        expect((await pool.getRewardPoolData()).developerRemaining).toBe(DEV_POOL - DEV_REWARD);

        const duplicate = await pool.sendClaimDeveloper(creator.getSender(), toNano('0.1'), project.address);
        expect(duplicate.transactions).toHaveTransaction({ from: creator.address, to: pool.address, success: false, exitCode: 2103 });
    });

    it('caps user reward at 10 TON and prevents duplicate claims', async () => {
        const creator = await blockchain.treasury('creator');
        const project = await blockchain.treasury('project');
        const user = await blockchain.treasury('user');

        await pool.sendSetProject(admin.getSender(), toNano('0.05'), {
            project: project.address,
            creator: creator.address,
            participants: 25,
            success: true,
        });
        await pool.sendRecordUser(admin.getSender(), toNano('0.05'), {
            project: project.address,
            user: user.address,
            tonAmount: toNano('15'),
        });

        const claim = await pool.sendClaimUser(user.getSender(), toNano('0.1'), project.address);
        expect(claim.transactions).toHaveTransaction({ from: user.address, to: pool.address, success: true });
        expect(outgoingJettonAmount(claim.transactions, pool.address, (await pool.getRewardPoolData()).myVcWalletAddress)).toBe(USER_REWARD);
        expect((await pool.getProjectRewardState(project.address)).userRewards).toBe(USER_REWARD);

        const duplicate = await pool.sendClaimUser(user.getSender(), toNano('0.1'), project.address);
        expect(duplicate.transactions).toHaveTransaction({ from: user.address, to: pool.address, success: false, exitCode: 2110 });
    });

    it('keeps emergency withdrawals admin-only', async () => {
        const destination = await blockchain.treasury('destination');
        const attacker = await blockchain.treasury('attacker');

        const rejected = await pool.sendWithdrawVC(attacker.getSender(), toNano('0.1'), {
            amount: 1n * VC,
            destination: destination.address,
        });
        expect(rejected.transactions).toHaveTransaction({ from: attacker.address, to: pool.address, success: false, exitCode: 2101 });

        const accepted = await pool.sendWithdrawVC(admin.getSender(), toNano('0.1'), {
            amount: 1n * VC,
            destination: destination.address,
        });
        expect(accepted.transactions).toHaveTransaction({ from: admin.address, to: pool.address, success: true });
        expect(outgoingJettonAmount(accepted.transactions, pool.address, (await pool.getRewardPoolData()).myVcWalletAddress)).toBe(1n * VC);
    });
});

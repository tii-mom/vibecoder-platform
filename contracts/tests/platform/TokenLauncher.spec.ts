import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { TokenLauncher } from '../../wrappers/TokenLauncher';
import '@ton/test-utils';
import { compileActonCode } from '../helpers/actonArtifacts';

describe('TokenLauncher', () => {
    let code: Cell;
    let projectTokenCode: Cell;
    let walletCode: Cell;
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let launcher: SandboxContract<TokenLauncher>;

    beforeAll(async () => {
        code = compileActonCode('token_launcher');
        projectTokenCode = compileActonCode('project_token');
        walletCode = compileActonCode('project_token_wallet');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');

        launcher = blockchain.openContract(TokenLauncher.createFromConfig({
            adminAddress: admin.address,
            masterCode: projectTokenCode,
            walletCode,
        }, code));

        const deployResult = await launcher.sendDeploy(admin.getSender(), toNano('0.05'));
        expect(deployResult.transactions).toHaveTransaction({
            from: admin.address,
            to: launcher.address,
            deploy: true,
            success: true,
        });
    });

    it('exposes launcher data', async () => {
        const data = await launcher.getLauncherData();

        expect(data.adminAddress.equals(admin.address)).toBe(true);
        expect(data.masterCode.hash().equals(projectTokenCode.hash())).toBe(true);
        expect(data.walletCode.hash().equals(walletCode.hash())).toBe(true);
    });

    it('rejects non-admin rescue', async () => {
        const attacker = await blockchain.treasury('attacker');
        const destination = await blockchain.treasury('destination');

        const result = await launcher.sendRescueTon(attacker.getSender(), toNano('0.05'), {
            destination: destination.address,
            amount: toNano('0.01'),
        });

        expect(result.transactions).toHaveTransaction({
            from: attacker.address,
            to: launcher.address,
            success: false,
            exitCode: 1201,
        });
    });
});

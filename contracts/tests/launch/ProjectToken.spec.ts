import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { ProjectToken } from '../../wrappers/ProjectToken';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('ProjectToken', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('ProjectToken');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let projectToken: SandboxContract<ProjectToken>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        projectToken = blockchain.openContract(ProjectToken.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await projectToken.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: projectToken.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and projectToken are ready to use
    });
});

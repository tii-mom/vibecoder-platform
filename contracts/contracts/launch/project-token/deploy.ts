import { beginCell, toNano } from '@ton/core';
import { ProjectToken } from '../../../wrappers/ProjectToken';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const adminAddress = provider.sender().address;
    if (!adminAddress) throw new Error('ProjectToken deploy requires a sender address');

    const projectToken = provider.open(ProjectToken.createFromConfig({
        adminAddress,
        maxSupply: toNano('1000000000'),
        content: beginCell().storeUint(1, 8).storeBuffer(Buffer.from('https://example.com/project-token.json')).endCell(),
        jettonWalletCode: await compile('ProjectTokenWallet'),
    }, await compile('ProjectToken')));

    await projectToken.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(projectToken.address);

    // run methods on `projectToken`
}

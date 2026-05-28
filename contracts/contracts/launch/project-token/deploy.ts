import { toNano } from '@ton/core';
import { ProjectToken } from '../../../wrappers/ProjectToken';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const projectToken = provider.open(ProjectToken.createFromConfig({}, await compile('ProjectToken')));

    await projectToken.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(projectToken.address);

    // run methods on `projectToken`
}

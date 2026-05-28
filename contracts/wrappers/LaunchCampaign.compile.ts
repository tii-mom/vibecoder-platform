import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/launch/launch-campaign/launch_campaign.tolk',
    withStackComments: true,
};

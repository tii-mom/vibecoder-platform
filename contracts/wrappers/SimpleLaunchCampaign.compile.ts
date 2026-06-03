import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/launch/simple-launch/simple_launch_campaign.tolk',
    withStackComments: true,
};

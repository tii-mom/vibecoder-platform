import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/platform/token-system/vc-reward-pool/vc_reward_pool.tolk',
    withStackComments: true,
};

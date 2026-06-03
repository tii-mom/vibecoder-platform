import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/platform/token-system/ecosystem-reward-pool/ecosystem_reward_pool.tolk',
    withStackComments: true,
};

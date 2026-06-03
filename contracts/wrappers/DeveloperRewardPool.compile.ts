import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/platform/token-system/developer-reward-pool/developer_reward_pool.tolk',
    withStackComments: true,
};

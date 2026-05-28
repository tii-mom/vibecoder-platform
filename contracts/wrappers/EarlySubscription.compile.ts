import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/platform/token-system/early-subscription/early_subscription.tolk',
    withStackComments: true,
};

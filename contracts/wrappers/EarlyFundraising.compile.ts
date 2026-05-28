import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/platform/token-system/early-fundraising/early_fundraising.tolk',
    withStackComments: true,
};

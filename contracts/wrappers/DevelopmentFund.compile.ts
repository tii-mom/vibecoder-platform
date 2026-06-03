import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/platform/token-system/development-fund/development_fund.tolk',
    withStackComments: true,
};

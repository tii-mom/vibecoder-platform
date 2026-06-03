import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/platform/token-system/reserve-vault/reserve_vault.tolk',
    withStackComments: true,
};

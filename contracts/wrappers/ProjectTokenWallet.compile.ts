import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/launch/project-token/project_token_wallet.tolk',
    withStackComments: true,
};

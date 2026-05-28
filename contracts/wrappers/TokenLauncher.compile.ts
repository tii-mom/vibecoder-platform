import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/platform/infra/token-launcher/token_launcher.tolk',
    withStackComments: true,
};

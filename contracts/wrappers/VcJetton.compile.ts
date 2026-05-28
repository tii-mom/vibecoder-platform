import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/platform/token-system/vc-jetton/vc_jetton.tolk',
    withStackComments: true,
};

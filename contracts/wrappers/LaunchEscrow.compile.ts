import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/launch/simple-launch/launch_escrow.tolk',
    withStackComments: true,
};

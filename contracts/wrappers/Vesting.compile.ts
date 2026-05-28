import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/launch/vesting/vesting.tolk',
    withStackComments: true,
};

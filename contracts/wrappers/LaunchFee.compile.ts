import { CompilerConfig } from '@ton/blueprint';
import { withActonTolkCompatibility } from './tolkCompatibility';

export const compile: CompilerConfig = withActonTolkCompatibility({
    lang: 'tolk',
    entrypoint: 'contracts/platform/token-system/launch-fee/launch_fee.tolk',
    withStackComments: true,
});

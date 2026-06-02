import { CompilerConfig } from '@ton/blueprint';
import { withActonTolkCompatibility } from './tolkCompatibility';

export const compile: CompilerConfig = withActonTolkCompatibility({
    lang: 'tolk',
    entrypoint: 'contracts/platform/token-system/vc-jetton/vc_jetton.tolk',
    withStackComments: true,
});

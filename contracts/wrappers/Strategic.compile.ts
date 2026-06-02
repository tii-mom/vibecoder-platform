import { CompilerConfig } from '@ton/blueprint';
import { withActonTolkCompatibility } from './tolkCompatibility';

export const compile: CompilerConfig = withActonTolkCompatibility({
    lang: 'tolk',
    entrypoint: 'contracts/platform/token-system/strategic/strategic.tolk',
    withStackComments: true,
});

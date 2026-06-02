import { CompilerConfig } from '@ton/blueprint';
import { withActonTolkCompatibility } from './tolkCompatibility';

export const compile: CompilerConfig = withActonTolkCompatibility({
    lang: 'tolk',
    entrypoint: 'contracts/launch/project-token/project_token_wallet.tolk',
    withStackComments: true,
});

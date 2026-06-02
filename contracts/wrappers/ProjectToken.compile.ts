import { CompilerConfig } from '@ton/blueprint';
import { withActonTolkCompatibility } from './tolkCompatibility';

export const compile: CompilerConfig = withActonTolkCompatibility({
    lang: 'tolk',
    entrypoint: 'contracts/launch/project-token/project_token.tolk',
    withStackComments: true,    // Fift output will contain comments, if you wish to debug its output
    experimentalOptions: '',    // you can pass experimental compiler options here
});

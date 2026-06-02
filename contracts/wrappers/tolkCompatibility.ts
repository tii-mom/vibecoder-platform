import { CompilerConfig } from '@ton/blueprint';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const legacyOriginalSources = new Map<string, string>();

function currentTolkJsSupportsNamespacedStdlib(): boolean {
    const packageJsonPath = require.resolve('@ton/tolk-js/package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string };
    const [major = 0, minor = 0] = (packageJson.version ?? '0.0.0').split('.').map((part) => Number(part));
    return major > 1 || (major === 1 && minor >= 2);
}

function applyLegacyBlueprintStdlibAliases(source: string): string {
    return source
        .replace(/contract\.getData\(\)/g, 'getContractData()')
        .replace(/contract\.setData\(/g, 'setContractData(')
        .replace(/contract\.getAddress\(\)/g, 'getMyAddress()');
}

function restoreLegacySources() {
    for (const [filePath, source] of legacyOriginalSources) {
        writeFileSync(filePath, source);
    }
    legacyOriginalSources.clear();
}

process.once('exit', restoreLegacySources);

export function withActonTolkCompatibility(config: CompilerConfig): CompilerConfig {
    return {
        ...config,
        preCompileHook: async (args) => {
            if (config.preCompileHook) {
                await config.preCompileHook(args);
            }
            if (config.lang !== 'tolk' || currentTolkJsSupportsNamespacedStdlib()) {
                return;
            }
            const entrypoint = join(process.cwd(), config.entrypoint);
            const source = readFileSync(entrypoint, 'utf8');
            legacyOriginalSources.set(entrypoint, source);
            writeFileSync(entrypoint, applyLegacyBlueprintStdlibAliases(source));
        },
        postCompileHook: async (code, args) => {
            restoreLegacySources();
            if (config.postCompileHook) {
                await config.postCompileHook(code, args);
            }
        },
    };
}

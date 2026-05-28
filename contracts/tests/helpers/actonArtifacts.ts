import { Cell } from '@ton/core';
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const contractsRoot = resolve(__dirname, '../..');

export function compileActonCode(contractName: string): Cell {
    const artifactPath = resolve(contractsRoot, 'build', `${contractName}.json`);
    if (!existsSync(artifactPath)) {
        execFileSync('acton', ['build', contractName], { cwd: contractsRoot, stdio: 'inherit' });
    }

    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as { code_boc64: string };
    return Cell.fromBoc(Buffer.from(artifact.code_boc64, 'base64'))[0];
}

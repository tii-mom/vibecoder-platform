#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const steps = [
  ['contracts build', 'npm', ['run', 'build'], 'contracts'],
  ['contracts typecheck', 'npm', ['run', 'typecheck'], 'contracts'],
  ['contracts tests', 'npm', ['test', '--', '--runInBand'], 'contracts'],
  ['contracts platform get-methods', 'npm', ['run', 'verify:get-methods'], 'contracts'],
  ['contracts VC jetton standard/indexing', 'npm', ['run', 'verify:vc-jetton'], 'contracts'],
  ['worker typecheck', 'npm', ['run', 'typecheck'], 'worker'],
  ['signer typecheck', 'npm', ['run', 'typecheck'], 'signer'],
  ['frontend typecheck', 'npm', ['run', 'lint'], 'vc'],
  ['frontend i18n', 'npm', ['run', 'lint:i18n'], 'vc'],
  ['frontend build', 'npm', ['run', 'build'], 'vc'],
  ['production config', 'npm', ['run', 'check:production'], 'vc'],
];

const failed = [];

for (const [label, command, args, cwd] of steps) {
  console.log(`\n[pre-mainnet] ${label}`);
  const result = spawnSync(command, args, {
    cwd: path.join(root, cwd),
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    failed.push(label);
  }
}

if (failed.length > 0) {
  console.error('\nPre-mainnet check failed:');
  for (const label of failed) console.error(`- ${label}`);
  process.exit(1);
}

console.log('\nPre-mainnet check passed.');

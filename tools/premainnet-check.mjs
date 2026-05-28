#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mainnetManifest = path.join(root, 'contracts', 'deployments', 'mainnet.platform.dry-run.json');

function readEnvFile(filepath) {
  const vars = {};
  if (!fs.existsSync(filepath)) return vars;
  const content = fs.readFileSync(filepath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return vars;
}

const envVars = {
  ...readEnvFile(path.join(root, '.env')),
  ...process.env,
};

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

const mainnetRequired = [
  'MAINNET_ADMIN_ADDRESS',
  'VC_METADATA_URI',
  'VC_EARLY_OPS_ADDRESS',
  'VC_LIQUIDITY_ADDRESS',
  'VC_TEAM_LOCKUP_ADDRESS',
];
const missingMainnet = mainnetRequired.filter((key) => !envVars[key]);
if (missingMainnet.length === 0) {
  const planEnv = {
    ...process.env,
    ...envVars,
    TON_NETWORK: 'mainnet',
    ALLOW_MAINNET_PLAN: '1',
  };

  for (const [label, command, args, cwd] of [
    ['mainnet platform dry-run manifest', 'npm', ['run', 'plan:mainnet'], 'contracts'],
    ['mainnet VC distribution dry-run', 'npm', ['run', 'plan:vc-distribution', '--', `--manifest=${mainnetManifest}`, '--check'], 'contracts'],
  ]) {
    console.log(`\n[pre-mainnet] ${label}`);
    const result = spawnSync(command, args, {
      cwd: path.join(root, cwd),
      stdio: 'inherit',
      env: planEnv,
    });
    if (result.status !== 0) {
      failed.push(label);
    }
  }
} else {
  console.log(`\n[pre-mainnet] mainnet dry-run skipped: missing ${missingMainnet.join(', ')}`);
}

if (failed.length > 0) {
  console.error('\nPre-mainnet check failed:');
  for (const label of failed) console.error(`- ${label}`);
  process.exit(1);
}

console.log('\nPre-mainnet check passed.');

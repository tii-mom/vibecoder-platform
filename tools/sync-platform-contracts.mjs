#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const networkArg = args.find((arg) => arg.startsWith('--network='));
const manifestArg = args.find((arg) => arg.startsWith('--manifest='));
const databaseArg = args.find((arg) => arg.startsWith('--database='));
const network = networkArg ? networkArg.slice('--network='.length) : 'testnet';
const manifestPath = manifestArg
  ? path.resolve(root, manifestArg.slice('--manifest='.length))
  : path.join(root, 'contracts', 'deployments', `${network}.platform${network === 'mainnet' ? '.dry-run' : ''}.json`);
const database = databaseArg ? databaseArg.slice('--database='.length) : 'vibecoder-db-new';

const defaultRequired = [
  'VC_JETTON',
  'FUND',
  'VC_REWARD_POOL',
  'EARLY_FUNDRAISING',
  'LAUNCH_FEE',
  'TOKEN_LAUNCHER',
];

function collectContracts(manifest) {
  const out = {};
  for (const group of ['basePlatformContracts', 'v3Contracts', 'contracts']) {
    const contracts = manifest[group] || {};
    for (const [name, value] of Object.entries(contracts)) {
      if (typeof value === 'string') out[name] = value;
      else if (value && typeof value === 'object' && typeof value.address === 'string') out[name] = value.address;
    }
  }
  return out;
}

function q(value) {
  return String(value).replace(/'/g, "''");
}

if (!fs.existsSync(manifestPath)) {
  console.error(`Missing manifest: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.network !== network) {
  console.error(`Manifest network mismatch: expected ${network}, got ${manifest.network}`);
  process.exit(1);
}

const contracts = collectContracts(manifest);
const required = manifest.basePlatformContracts || manifest.v3Contracts || manifest.product === 'SimpleLaunch'
  ? Object.keys(contracts)
  : defaultRequired;
const missing = required.filter((name) => !contracts[name]);
if (missing.length > 0) {
  console.error(`Missing contracts in manifest: ${missing.join(', ')}`);
  process.exit(1);
}

const statements = required.map((name) => {
  const id = `${network}-${name}`;
  const address = contracts[name];
  return `INSERT OR REPLACE INTO platform_contracts (id, contract_name, address, network, deployed_at) VALUES ('${q(id)}', '${q(name)}', '${q(address)}', '${q(network)}', CURRENT_TIMESTAMP);`;
});
const sql = `${statements.join('\n')}\n`;

console.log(sql);

if (!apply) {
  console.log('-- dry-run only; pass --apply to execute against Cloudflare D1');
  process.exit(0);
}

const result = spawnSync('npx', ['wrangler', 'd1', 'execute', database, '--remote', '--command', sql], {
  cwd: path.join(root, 'worker'),
  stdio: 'inherit',
});

process.exit(result.status ?? 1);

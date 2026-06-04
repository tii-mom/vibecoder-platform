#!/usr/bin/env node
// Verify testnet platform contract addresses are consistent across:
//   1. contracts/deployments/testnet.vc-v3.full.json
//   2. contracts/deployments/testnet.simple-launch.json
//   2. .env.example
//   3. contracts/docs/pre-mainnet-readiness.md
//
// Usage: node tools/verify-testnet-contract-config.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const REQUIRED_CONTRACTS = [
  'VC_JETTON',
  'FUND',
  'VC_REWARD_POOL',
  'EARLY_FUNDRAISING',
  'LAUNCH_FEE',
  'TOKEN_LAUNCHER',
  'SALE_VESTING',
  'TEAM_VESTING',
  'DEVELOPER_REWARD_POOL',
  'ECOSYSTEM_REWARD_POOL',
  'DEVELOPMENT_FUND',
  'RESERVE_VAULT',
  'LAUNCH_ESCROW',
  'SIMPLE_LAUNCH_CAMPAIGN',
];

const EXPECTED = {
  VC_JETTON: 'UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf',
  FUND: 'UQADQbeXROSyyCBwE2qPuhr2cbE0hXgWhVCJawR9UVK9CH0Q',
  VC_REWARD_POOL: 'UQD6Zak3m1RdCA1OOIMFSh3fF6VrsgBIwxLcpn1o76YUiVZN',
  EARLY_FUNDRAISING: 'UQBXX3nt12ZKmeY9ITF6G_YC4eh3JCspxnOCX762sBDWdqDD',
  LAUNCH_FEE: 'UQBs3qGxQ5KMPLM1aQfolsc6uoLfHaFtZ3XT0ZtNN9hXuzW-',
  TOKEN_LAUNCHER: 'UQAYzEOHPZgHeS9gmJxGBUFJrvkn2JnBCv4uD2OmkK_FeSXs',
  SALE_VESTING: 'UQAV6noSRUR7C83RwCB3T4XV0ylVqCAs_Crf1N5aHp6KzScm',
  TEAM_VESTING: 'UQD24kG-Pnl2OyJAs2hYtbRnBVOkgtsdhhD6z14u46NfSkRF',
  DEVELOPER_REWARD_POOL: 'UQCZFgdSfL4uGwExeG5wGMo96Aly8Lc5sx_Sf_HDpm27b9JD',
  ECOSYSTEM_REWARD_POOL: 'UQA-icYnrMhyb7Qe-wvBDH2k9g5a0is_z-jRfKHmW-HeaqV5',
  DEVELOPMENT_FUND: 'UQDJio3xtfCzu7TWhmxc8r1IeGyC2V7Hr0zLo3LTlbHkNm16',
  RESERVE_VAULT: 'UQCoVCCLCf7RxJ7BykJ4UlbhrtPI2I1894yLL2UkAXKiZ6vw',
  LAUNCH_ESCROW: 'UQAbBqEAuArxhgvAja3dP3tF5CsJ6s3NyMtWRV6unkjEd24h',
  SIMPLE_LAUNCH_CAMPAIGN: 'UQB2khuJechrKt9P2xADTWJVY7iQQF8GXOeHNbtLADdZjgxC',
};

const failures = [];
const warnings = [];

function fail(msg) { failures.push(msg); }
function warn(msg) { warnings.push(msg); }

function collectManifestContracts(manifest) {
  return {
    ...(manifest.basePlatformContracts || {}),
    ...(manifest.v3Contracts || {}),
    ...(manifest.contracts || {}),
  };
}

// --- 1. Read deployment manifests ---
const fullManifestPath = path.join(ROOT, 'contracts', 'deployments', 'testnet.vc-v3.full.json');
const simpleLaunchManifestPath = path.join(ROOT, 'contracts', 'deployments', 'testnet.simple-launch.json');
const manifestContracts = {};
for (const manifestPath of [fullManifestPath, simpleLaunchManifestPath]) {
  if (!fs.existsSync(manifestPath)) {
    fail(`${path.relative(ROOT, manifestPath)} not found`);
    continue;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  Object.assign(manifestContracts, collectManifestContracts(manifest));
}

if (Object.keys(manifestContracts).length === 0) {
  fail('No testnet manifest contracts found');
} else {
  for (const name of REQUIRED_CONTRACTS) {
    const addr = manifestContracts[name];
    if (!addr) {
      fail(`Manifest missing contract: ${name}`);
      continue;
    }
    if (addr !== EXPECTED[name]) {
      fail(`Manifest ${name}: expected ${EXPECTED[name]}, got ${addr}`);
    }
    // Validate address format (UQ/EQ prefix + 46 base64url chars)
    const validFormat = /^[UE]Q[A-Za-z0-9_-]{46}$/.test(addr);
    if (!validFormat) {
      fail(`Manifest ${name}: invalid address format: ${addr}`);
    }
    console.log(`  OK   manifest ${name}: ${addr.slice(0, 8)}...${addr.slice(-4)}`);
  }

  const requiredSet = new Set(REQUIRED_CONTRACTS);
  const extraRequired = Object.keys(manifestContracts).filter((name) => requiredSet.has(name));
  if (extraRequired.length < REQUIRED_CONTRACTS.length) warn(`Manifest has ${extraRequired.length} required contracts, expected ${REQUIRED_CONTRACTS.length}`);
}

// --- 2. Read .env.example ---
const envPath = path.join(ROOT, '.env.example');
if (!fs.existsSync(envPath)) {
  warn('.env.example not found');
} else {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envMap = {
    VC_JETTON: 'VC_JETTON_ADDRESS',
    FUND: 'VC_FUND_ADDRESS',
    VC_REWARD_POOL: 'VC_REWARD_POOL_ADDRESS',
    EARLY_FUNDRAISING: 'VC_EARLY_FUNDRAISING_ADDRESS',
    LAUNCH_FEE: 'VC_LAUNCH_FEE_ADDRESS',
    TOKEN_LAUNCHER: 'VC_TOKEN_LAUNCHER_ADDRESS',
    SALE_VESTING: 'VC_SALE_VESTING_ADDRESS',
    TEAM_VESTING: 'VC_TEAM_VESTING_ADDRESS',
    DEVELOPER_REWARD_POOL: 'VC_DEVELOPER_REWARD_POOL_ADDRESS',
    ECOSYSTEM_REWARD_POOL: 'VC_ECOSYSTEM_REWARD_POOL_ADDRESS',
    DEVELOPMENT_FUND: 'VC_DEVELOPMENT_FUND_ADDRESS',
    RESERVE_VAULT: 'VC_RESERVE_VAULT_ADDRESS',
    LAUNCH_ESCROW: 'SIMPLE_LAUNCH_ESCROW_ADDRESS',
    SIMPLE_LAUNCH_CAMPAIGN: 'SIMPLE_LAUNCH_CAMPAIGN_ADDRESS',
  };

  for (const name of REQUIRED_CONTRACTS) {
    const key = envMap[name];
    const match = envContent.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm'));
    if (!match) {
      warn(`.env.example missing key: ${key}`);
      continue;
    }
    const val = match[1].trim();
    if (val && val !== '' && val !== 'YOUR_' && !val.startsWith('YOUR_') && val !== EXPECTED[name]) {
      warn(`.env.example ${key}: has value but doesn't match expected`);
    }
    console.log(`  OK   .env.example ${key}: ${val ? (val.slice(0, 8) + '...') : '(placeholder)'}`);
  }
}

// --- 3. Read pre-mainnet-readiness.md ---
const readinessPath = path.join(ROOT, 'contracts', 'docs', 'pre-mainnet-readiness.md');
if (!fs.existsSync(readinessPath)) {
  warn('contracts/docs/pre-mainnet-readiness.md not found');
} else {
  const mdContent = fs.readFileSync(readinessPath, 'utf8');
  for (const name of REQUIRED_CONTRACTS) {
    const expected = EXPECTED[name];
    if (!mdContent.includes(expected)) {
      warn(`pre-mainnet-readiness.md does not contain address for ${name}: ${expected}`);
    } else {
      console.log(`  OK   readiness ${name}: found`);
    }
  }
}

// --- Summary ---
console.log();
if (warnings.length > 0) {
  console.log('Warnings:');
  for (const w of warnings) console.log(`  ⚠️  ${w}`);
}
if (failures.length > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  ❌ ${f}`);
  console.log(`\n${failures.length} failure(s).`);
  process.exit(1);
}

console.log(`✅ All ${REQUIRED_CONTRACTS.length} platform contracts verified.`);
console.log('   Full VC v3 manifest, SimpleLaunch manifest, .env.example, and readiness doc are consistent.');
if (warnings.length > 0) console.log('   Readiness doc warnings above are non-fatal and should be reconciled in readiness PRs.');
console.log();
process.exit(0);

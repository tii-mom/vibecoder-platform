#!/usr/bin/env node
// Verify testnet platform contract addresses are consistent across:
//   1. contracts/deployments/testnet.platform.json
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
];

const EXPECTED = {
  VC_JETTON: 'UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf',
  FUND: 'UQADQbeXROSyyCBwE2qPuhr2cbE0hXgWhVCJawR9UVK9CH0Q',
  VC_REWARD_POOL: 'UQD6Zak3m1RdCA1OOIMFSh3fF6VrsgBIwxLcpn1o76YUiVZN',
  EARLY_FUNDRAISING: 'UQBXX3nt12ZKmeY9ITF6G_YC4eh3JCspxnOCX762sBDWdqDD',
  LAUNCH_FEE: 'UQBs3qGxQ5KMPLM1aQfolsc6uoLfHaFtZ3XT0ZtNN9hXuzW-',
  TOKEN_LAUNCHER: 'UQAYzEOHPZgHeS9gmJxGBUFJrvkn2JnBCv4uD2OmkK_FeSXs',
};

const failures = [];
const warnings = [];

function fail(msg) { failures.push(msg); }
function warn(msg) { warnings.push(msg); }

// --- 1. Read testnet.platform.json ---
const manifestPath = path.join(ROOT, 'contracts', 'deployments', 'testnet.platform.json');
if (!fs.existsSync(manifestPath)) {
  fail('contracts/deployments/testnet.platform.json not found');
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const contracts = manifest.contracts || {};

  for (const name of REQUIRED_CONTRACTS) {
    const entry = contracts[name];
    if (!entry) {
      fail(`Manifest missing contract: ${name}`);
      continue;
    }
    const addr = entry.address;
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

  if (Object.keys(contracts).length !== 6) {
    warn(`Manifest has ${Object.keys(contracts).length} contracts, expected 6`);
  }
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
console.log(`   Manifest, .env.example, and readiness doc are consistent.\n`);
process.exit(0);

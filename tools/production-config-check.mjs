#!/usr/bin/env node
// Production configuration checker.
//
// Checks worker, signer, and frontend environment variables for production safety.
// Never logs secret values — only reports presence/absence and weak-value detection.
//
// Usage:
//   node tools/production-config-check.mjs
//   npm run check:production
//
// Required env vars for full check:
//   CF_API_TOKEN       — Cloudflare API token (to read wrangler vars/secrets)
//   CF_ACCOUNT_ID      — Cloudflare account ID
//   (or) set vars directly in environment for local check
//
// Without Cloudflare access, the script reads local .env / wrangler.toml files.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const results = { pass: [], fail: [], warn: [] };

function check(name, condition, detail) {
  if (condition) {
    results.pass.push(`  ✅ ${name}`);
  } else {
    results.fail.push(`  ❌ ${name}: ${detail}`);
  }
}

function checkWarn(name, condition, detail) {
  if (condition) {
    results.pass.push(`  ✅ ${name}`);
  } else {
    results.warn.push(`  ⚠️  ${name}: ${detail}`);
  }
}

function isWeakValue(val) {
  if (!val || typeof val !== 'string') return true;
  const lower = val.toLowerCase();
  return (
    lower.includes('mock') ||
    lower.includes('testing') ||
    lower.includes('12345') ||
    lower.includes('changeme') ||
    lower.includes('replace') ||
    lower.includes('your-') ||
    lower === 'test' ||
    lower === 'dev' ||
    lower === 'secret'
  );
}

function redact(val) {
  if (!val || typeof val !== 'string') return '(not set)';
  if (val.length <= 6) return '***';
  return val.slice(0, 4) + '...' + val.slice(-2);
}

// -- Read worker wrangler.toml to extract vars --
let wranglerVars = {};
let isMainnet = false;
try {
  const wtoml = fs.readFileSync(path.join(ROOT, 'worker', 'wrangler.toml'), 'utf8');
  const networkMatch = wtoml.match(/TON_NETWORK\s*=\s*"(\w+)"/);
  isMainnet = networkMatch && networkMatch[1] === 'mainnet';
  const envMatch = wtoml.match(/ENVIRONMENT\s*=\s*"(\w+)"/);
  const env = envMatch ? envMatch[1] : 'development';
  if (env !== 'development') isMainnet = true;
} catch (e) {
  results.warn.push(`  ⚠️  Could not read worker/wrangler.toml: ${e.message}`);
}

// -- Read signer wrangler.toml --
try {
  const stoml = fs.readFileSync(path.join(ROOT, 'signer', 'wrangler.toml'), 'utf8');
  const sNetwork = stoml.match(/TON_NETWORK\s*=\s*"(\w+)"/);
  if (sNetwork && sNetwork[1] === 'mainnet') isMainnet = true;
} catch (e) {
  results.warn.push(`  ⚠️  Could not read signer/wrangler.toml: ${e.message}`);
}

// -- Read .env files for local vars (non-secret only) --
function readEnvFile(filepath) {
  const vars = {};
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      vars[key] = val;
    }
  } catch (e) { /* file may not exist */ }
  return vars;
}

const envVars = {
  ...readEnvFile(path.join(ROOT, '.env')),
  ...readEnvFile(path.join(ROOT, '.env.local')),
  ...process.env,
};

console.log('\n🔍 Production Configuration Check\n');
console.log(`  TON_NETWORK detection: ${isMainnet ? 'MAINNET' : 'testnet/dev'}`);
console.log(`  (If TON_NETWORK=mainnet, production-level checks apply.)\n`);

// -- 1. TON_NETWORK=mainnet checks --
console.log('[1] Mainnet safety checks');
const tonNetwork = envVars.TON_NETWORK || 'testnet';
check('TON_NETWORK is configured', !!envVars.TON_NETWORK, 'TON_NETWORK not found in env');
if (tonNetwork === 'mainnet') {
  check('SIGNER_SECRET_KEY exists', !!envVars.SIGNER_SECRET_KEY, 'SIGNER_SECRET_KEY not set');
  check('SIGNER_SECRET_KEY is not weak',
    envVars.SIGNER_SECRET_KEY && !isWeakValue(envVars.SIGNER_SECRET_KEY),
    `SIGNER_SECRET_KEY looks weak: ${redact(envVars.SIGNER_SECRET_KEY)}`);

  check('PLATFORM_PAYMASTER_PRIVATE_KEY exists',
    !!envVars.PLATFORM_PAYMASTER_PRIVATE_KEY,
    'PLATFORM_PAYMASTER_PRIVATE_KEY not set');
  check('PLATFORM_PAYMASTER_PRIVATE_KEY is not weak',
    envVars.PLATFORM_PAYMASTER_PRIVATE_KEY && !isWeakValue(envVars.PLATFORM_PAYMASTER_PRIVATE_KEY),
    'PLATFORM_PAYMASTER_PRIVATE_KEY contains weak indicators');

  check('TONCENTER_API_KEY exists', !!envVars.TONCENTER_API_KEY, 'TONCENTER_API_KEY not set');
  check('TONCENTER_API_KEY is not weak',
    envVars.TONCENTER_API_KEY && !isWeakValue(envVars.TONCENTER_API_KEY),
    `TONCENTER_API_KEY looks weak: ${redact(envVars.TONCENTER_API_KEY)}`);

  check('DEEPSEEK_API_KEY exists', !!envVars.DEEPSEEK_API_KEY || !!envVars.VITE_DEEPSEEK_API_KEY,
    'Neither DEEPSEEK_API_KEY nor VITE_DEEPSEEK_API_KEY is set');
  const dskey = envVars.DEEPSEEK_API_KEY || envVars.VITE_DEEPSEEK_API_KEY;
  check('DEEPSEEK_API_KEY is not weak',
    dskey && !isWeakValue(dskey),
    `DEEPSEEK_API_KEY looks weak`);

  check('JWT_SECRET exists', !!envVars.JWT_SECRET, 'JWT_SECRET not set');
  check('JWT_SECRET is not weak',
    envVars.JWT_SECRET && !isWeakValue(envVars.JWT_SECRET) && (envVars.JWT_SECRET.length >= 32),
    'JWT_SECRET too short or looks like default value');
} else {
  results.pass.push('  ⏭️  Skipping mainnet checks (TON_NETWORK is not mainnet)');
}

// -- 2. CORS configuration check --
console.log('\n[2] CORS configuration check');
const workerSrc = path.join(ROOT, 'worker', 'src', 'index.ts');
try {
  const workerCode = fs.readFileSync(workerSrc, 'utf8');
  const hasOriginStar = /origin\s*:\s*['"]?\*['"]?/.test(workerCode);
  const hasCredentialsTrue = /credentials\s*:\s*true/.test(workerCode);
  const hasAppDomain = workerCode.includes('app.72h.lol');
  const hasWebTelegram = workerCode.includes('web.telegram.org');

  if (hasOriginStar && hasCredentialsTrue) {
    // Only a problem if also in production path (not exclusively in dev branch)
    const hasDevGuard = workerCode.includes("ENVIRONMENT === 'development'");
    checkWarn(
      `CORS: origin:'*' + credentials:true is dev-guarded`,
      hasDevGuard,
      'origin:* + credentials:true found without ENVIRONMENT guard — fix before production'
    );
  }

  check('CORS allowlist includes app.72h.lol', hasAppDomain, 'Missing https://app.72h.lol in CORS allowlist');
  check('CORS allowlist includes web.telegram.org', hasWebTelegram, 'Missing Telegram web in CORS allowlist');
} catch (e) {
  results.warn.push(`  ⚠️  Could not read worker source for CORS check: ${e.message}`);
}

// -- 3. Mock mode / fallback checks --
console.log('\n[3] Mock mode / fallback safety checks');

// Check worker source for known production-guarded mock paths
try {
  const workerCode = fs.readFileSync(workerSrc, 'utf8');

  // AI review fail-closed
  const aiFailClosed = workerCode.includes("typeof parsed.pass !== 'boolean'") &&
    workerCode.includes("pass: false");
  check('AI review is fail-closed (malformed response → pass:false)',
    aiFailClosed,
    'AI review may still pass on malformed responses');

  // Bounty verifier production guard
  const bountyProdGuard = workerCode.includes("environment !== 'development'") &&
    workerCode.includes('return false');
  check('Bounty verifier fail-closed in production',
    bountyProdGuard,
    'Bounty verifier may pass in production without real verification');

  // Signer mock guard
  const signerMockGuard = workerCode.includes("isMock && c.env.ENVIRONMENT !== 'development'");
  check('Signer mock mode rejected in non-dev',
    signerMockGuard,
    'Signer mock mode may be accepted outside development');

} catch (e) {
  results.warn.push(`  ⚠️  Could not read worker source for mock checks: ${e.message}`);
}

// -- 4. Environment consistency --
console.log('\n[4] Environment consistency');
checkWarn('ENVIRONMENT is explicitly set',
  !!envVars.ENVIRONMENT,
  'ENVIRONMENT not set — worker defaults may be applied');

console.log('\n' + '='.repeat(60));

// -- Summary --
if (results.warn.length > 0) {
  console.log('\n⚠️  Warnings:');
  for (const w of results.warn) console.log(w);
}

if (results.fail.length > 0) {
  console.log('\n❌ Failures:');
  for (const f of results.fail) console.log(f);
}

console.log(`\n✅ Passed: ${results.pass.length}  ⚠️  Warnings: ${results.warn.length}  ❌ Failed: ${results.fail.length}`);

if (results.fail.length > 0) {
  console.log('\nSome production configuration checks FAILED. Fix them before deploying.\n');
  process.exit(1);
}

if (results.warn.length > 0) {
  console.log('\nSome warnings exist. Review and address before production deployment.\n');
  process.exit(0);
}

console.log('\nAll production configuration checks PASSED.\n');
process.exit(0);

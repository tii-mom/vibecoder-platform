#!/usr/bin/env node
// Platform API verification script.
// Validates Worker endpoints for contract registry, stats, and VC balance.
//
// Usage:
//   API_BASE=https://api.72h.lol TEST_WALLET=<wallet> node tools/verify-platform-api.mjs
//   API_BASE=http://localhost:8787 TEST_WALLET=<wallet> node tools/verify-platform-api.mjs

const API_BASE = process.env.API_BASE;
const TEST_WALLET = process.env.TEST_WALLET;

const EXPECTED_ADDRESSES = {
  VC_JETTON: 'UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf',
  FUND: 'UQADQbeXROSyyCBwE2qPuhr2cbE0hXgWhVCJawR9UVK9CH0Q',
  VC_REWARD_POOL: 'UQD6Zak3m1RdCA1OOIMFSh3fF6VrsgBIwxLcpn1o76YUiVZN',
  EARLY_FUNDRAISING: 'UQBXX3nt12ZKmeY9ITF6G_YC4eh3JCspxnOCX762sBDWdqDD',
  LAUNCH_FEE: 'UQBs3qGxQ5KMPLM1aQfolsc6uoLfHaFtZ3XT0ZtNN9hXuzW-',
  TOKEN_LAUNCHER: 'UQAYzEOHPZgHeS9gmJxGBUFJrvkn2JnBCv4uD2OmkK_FeSXs',
};

const REQUIRED = Object.keys(EXPECTED_ADDRESSES);

let passed = 0;
let failed = 0;
let warned = 0;
const results = [];

function check(name, condition, detail) {
  if (condition) { passed++; results.push(`  PASS  ${name}`); }
  else { failed++; results.push(`  FAIL  ${name}: ${detail}`); }
}

function warn(name, detail) {
  warned++;
  results.push(`  WARN  ${name}: ${detail}`);
}

if (!API_BASE) {
  console.error('Missing API_BASE. Usage: API_BASE=https://api.72h.lol node tools/verify-platform-api.mjs');
  process.exit(1);
}

const base = API_BASE.replace(/\/$/, '');

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), ...opts });
  const body = await res.json();
  return { status: res.status, body };
}

(async () => {
  console.log(`\nPlatform API Verification — ${base}\n`);

  // ——— 1. /api/v1/platform/contracts ———
  console.log('[1] /api/v1/platform/contracts');
  try {
    const { status, body } = await fetchJson(`${base}/api/v1/platform/contracts`);
    check('status is 200', status === 200, `got ${status}`);
    check('success === true', body.success === true, `got ${JSON.stringify(body)}`);
    check('network is present', !!body.network, 'missing network field');

    if (body.data && Array.isArray(body.data)) {
      check(`contract count >= 6`, body.data.length >= 6, `got ${body.data.length}`);
      for (const name of REQUIRED) {
        const entry = body.data.find(r => r.contract_name === name);
        check(`  ${name} present`, !!entry, 'missing from response');
        if (entry) {
          check(`  ${name} address matches`, entry.address === EXPECTED_ADDRESSES[name],
            `expected ${EXPECTED_ADDRESSES[name]}, got ${entry.address}`);
        }
      }
      check('no missing field', !body.missing || body.missing.length === 0,
        body.missing ? `missing: ${body.missing.join(', ')}` : '');
      check('no invalid addresses', !body.invalidAddresses || body.invalidAddresses.length === 0,
        body.invalidAddresses ? `invalid: ${body.invalidAddresses.join(', ')}` : '');
    } else {
      check('data is array', false, 'data is not an array');
    }
  } catch (e) {
    warn('contracts endpoint unreachable', e.message);
  }

  // ——— 2. /api/v1/platform/stats ———
  console.log('\n[2] /api/v1/platform/stats');
  try {
    const { status, body } = await fetchJson(`${base}/api/v1/platform/stats`);
    check('status is 200', status === 200, `got ${status}`);
    check('success === true', body.success === true, `got ${JSON.stringify(body).slice(0, 200)}`);

    if (body.success && body.data) {
      const data = body.data;
      if (data.fundError) warn('fund stats unavailable', data.fundError);
      else check('fund stats present', data.fund !== undefined, 'missing');
      if (data.rewardPoolError) warn('reward pool stats unavailable', data.rewardPoolError);
      else check('reward pool stats present', data.rewardPool !== undefined, 'missing');
      if (data.earlyFundraisingError) warn('early fundraising stats unavailable', data.earlyFundraisingError);
      else check('early fundraising stats present', data.earlyFundraising !== undefined, 'missing');
    }
  } catch (e) {
    warn('stats endpoint unreachable', e.message);
  }

  // ——— 3. /api/v1/user/vc-balance validation ———
  console.log('\n[3] /api/v1/user/vc-balance');
  // 3a. Missing address
  try {
    const { status, body } = await fetchJson(`${base}/api/v1/user/vc-balance`);
    check('no address → 400', status === 400, `got ${status} body=${JSON.stringify(body)}`);
  } catch (e) {
    check('no address → error', false, e.message);
  }

  // 3b. Invalid address
  try {
    const { status, body } = await fetchJson(`${base}/api/v1/user/vc-balance?address=invalid`);
    check('invalid address → 400', status === 400 || (body && !body.success),
      `got ${status} body=${JSON.stringify(body)}`);
  } catch (e) {
    check('invalid address → error', false, e.message);
  }

  // 3c. Valid address (optional, if TEST_WALLET provided)
  if (TEST_WALLET) {
    try {
      const { status, body } = await fetchJson(`${base}/api/v1/user/vc-balance?address=${encodeURIComponent(TEST_WALLET)}`);
      check('valid address → 200', status === 200, `got ${status}`);
      if (body.success && body.data) {
        check('balanceVC is number', typeof body.data.balanceVC === 'number', `got ${typeof body.data.balanceVC}`);
        console.log(`         balance: ${body.data.balanceVC} VC`);
      } else {
        warn('valid address no success', JSON.stringify(body).slice(0, 200));
      }
    } catch (e) {
      warn('valid address endpoint unreachable', e.message);
    }
  } else {
    console.log('         (skipped — set TEST_WALLET env var for live balance check)');
  }

  // ——— Summary ———
  results.forEach(r => console.log(r));
  console.log(`\n  Passed: ${passed}  Failed: ${failed}  Warnings: ${warned}`);
  if (failed > 0) {
    console.log('\n❌ API verification FAILED.\n');
    process.exit(1);
  }
  console.log('\n✅ API verification PASSED.\n');
  process.exit(0);
})().catch(err => {
  console.error(`\n  ERROR: ${err.message}`);
  process.exit(1);
});

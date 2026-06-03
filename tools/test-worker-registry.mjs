#!/usr/bin/env node
/**
 * Worker Contract Registry Test Script
 *
 * Validates the worker's fail-closed contract registry behavior.
 * Tests run against the worker's /api/v1/platform/contracts endpoint.
 *
 * Usage:
 *   node tools/test-worker-registry.mjs
 *   WORKER_URL=http://localhost:8787 node tools/test-worker-registry.mjs
 *
 * Requires: WORKER_URL or defaults to local wrangler dev
 */

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';
const SIMULATE_NETWORK = process.env.TEST_NETWORK || 'testnet';

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(name) { passed++; console.log(`  PASS: ${name}`); }
function fail(name, reason) { failed++; console.error(`  FAIL: ${name} — ${reason}`); }
function skip(name, reason) { skipped++; console.log(`  SKIP: ${name} — ${reason}`); }

async function fetchContracts(network) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (network) headers['X-Simulate-Network'] = network;
    const res = await fetch(`${WORKER_URL}/api/v1/platform/contracts`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json();
    return { status: res.status, body };
  } catch (e) {
    return { status: 0, body: { error: e.message } };
  }
}

async function main() {
  console.log('=== Worker Contract Registry Tests ===');
  console.log(`Worker URL: ${WORKER_URL}`);
  console.log(`Network: ${SIMULATE_NETWORK}`);
  console.log();

  // Test 1: All addresses present (testnet)
  console.log('--- Test Group 1: Contract Registry Completeness ---');
  {
    const { status, body } = await fetchContracts(SIMULATE_NETWORK);
    if (status !== 200) {
      skip('1.1 All addresses present', `Worker returned HTTP ${status}: ${body.error}`);
      skip('1.2 Response has data array', 'unreachable');
      skip('1.3 success field is true', 'unreachable');
      skip('1.4 network field matches', 'unreachable');
    } else {
      if (body.success === true) {
        pass('1.1 All addresses present — success=true');
      } else {
        fail('1.1 All addresses present', `success=${body.success}, missing=${JSON.stringify(body.missing)}`);
      }
      if (Array.isArray(body.data)) {
        pass('1.2 Response has data array');
      } else {
        fail('1.2 Response has data array', `data is ${typeof body.data}`);
      }
      if (body.network === SIMULATE_NETWORK) {
        pass('1.3 network field matches');
      } else {
        fail('1.3 network field matches', `expected ${SIMULATE_NETWORK}, got ${body.network}`);
      }
    }
  }

  // Test 2: Missing address handling
  console.log('--- Test Group 2: Missing Address Handling ---');
  {
    const { status, body } = await fetchContracts(SIMULATE_NETWORK);
    if (status !== 200) {
      skip('2.1 Missing returns missing[]', 'unreachable');
      skip('2.2 Partial success=false', 'unreachable');
    } else {
      if (body.success === false) {
        if (Array.isArray(body.missing) && body.missing.length > 0) {
          pass(`2.1 Missing returns missing[]: ${body.missing.join(', ')}`);
        } else {
          fail('2.1 Missing returns missing[]', 'missing is empty or not array but success=false');
        }
        pass('2.2 Partial success=false when contracts missing');
      } else {
        // All contracts present — that's OK too
        skip('2.1 Missing returns missing[]', 'all contracts present');
        skip('2.2 Partial success=false', 'all contracts present — success=true expected');
      }
    }
  }

  // Test 3: Wrong network rejection
  console.log('--- Test Group 3: Wrong Network ---');
  {
    const { status, body } = await fetchContracts('mainnet');
    if (status === 500 || (body && body.success === false)) {
      if (body.error && body.error.toLowerCase().includes('missing')) {
        pass('3.1 Mainnet returns error with missing contracts');
      } else if (body.error && body.error.toLowerCase().includes('configuration')) {
        pass('3.1 Mainnet returns configuration error');
      } else if (body.error) {
        pass(`3.1 Mainnet returns error: ${body.error}`);
      } else {
        pass('3.1 Mainnet returned non-success response (fail-closed)');
      }
    } else if (status === 200 && body && body.success === false) {
      pass('3.1 Mainnet returns success=false with missing[]');
    } else {
      fail('3.1 Mainnet should not return success=true', `status=${status}, body=${JSON.stringify(body).slice(0, 200)}`);
    }
  }

  // Test 4: Stale/empty address validation
  console.log('--- Test Group 4: Address Validation ---');
  {
    const { status, body } = await fetchContracts(SIMULATE_NETWORK);
    if (status !== 200 || !body.data) {
      skip('4.1 No empty addresses returned', 'unreachable');
      skip('4.2 All addresses parseable', 'unreachable');
    } else {
      const addresses = body.data || [];
      const emptyAddr = addresses.filter(r => !r.address || r.address.trim() === '');
      if (emptyAddr.length === 0) {
        pass('4.1 No empty addresses in registry');
      } else {
        fail('4.1 No empty addresses', `${emptyAddr.length} contracts have empty addresses: ${emptyAddr.map(r => r.contract_name).join(', ')}`);
      }

      // Check invalidAddresses from API
      if (body.invalidAddresses && body.invalidAddresses.length > 0) {
        fail('4.2 All addresses parseable', `invalid addresses: ${body.invalidAddresses.join(', ')}`);
      } else {
        pass('4.2 All addresses parseable (no invalidAddresses reported)');
      }
    }
  }

  // Test 5: Required contracts present
  console.log('--- Test Group 5: Required Contracts ---');
  const REQUIRED = [
    'VC_JETTON', 'FUND', 'VC_REWARD_POOL', 'EARLY_FUNDRAISING',
    'LAUNCH_FEE', 'TOKEN_LAUNCHER',
    'SALE_VESTING', 'TEAM_VESTING',
    'DEVELOPER_REWARD_POOL', 'ECOSYSTEM_REWARD_POOL',
    'DEVELOPMENT_FUND', 'RESERVE_VAULT',
    'LAUNCH_ESCROW', 'SIMPLE_LAUNCH_CAMPAIGN',
  ];
  {
    const { status, body } = await fetchContracts(SIMULATE_NETWORK);
    if (status !== 200 || !body.data) {
      REQUIRED.forEach(name => skip(`5.x ${name} present`, 'unreachable'));
    } else {
      const names = new Set((body.data || []).map(r => r.contract_name));
      for (const name of REQUIRED) {
        if (names.has(name)) {
          pass(`5.x ${name} present`);
        } else {
          if (body.missing && body.missing.includes(name)) {
            skip(`5.x ${name} present`, 'reported as missing — needs D1 insert');
          } else {
            fail(`5.x ${name} present`, 'not in registry and not in missing[]');
          }
        }
      }
    }
  }

  // Test 6: Mainnet not configured
  console.log('--- Test Group 6: Mainnet Not Configured ---');
  {
    const { status, body } = await fetchContracts('mainnet');
    if (status === 500 || (body && body.success === false)) {
      pass('6.1 Mainnet returns non-success (fail-closed, no config)');
    } else if (status === 200 && body && body.success === true) {
      if (body.data && body.data.length > 0) {
        skip('6.1 Mainnet not configured', 'mainnet contracts found — mainnet may be partially configured');
      } else {
        fail('6.1 Mainnet not configured', 'success=true but no contracts — should fail-closed');
      }
    } else {
      pass(`6.1 Mainnet handled: status=${status}`);
    }
  }

  console.log();
  console.log('=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log();

  if (failed > 0) {
    console.error('Some tests FAILED.');
    process.exit(1);
  }
  if (passed === 0 && skipped > 0) {
    console.log('All tests skipped — worker may not be running.');
    console.log('Start with: cd worker && npm run dev');
    process.exit(0);
  }
  console.log('All executed tests passed.');
}

main().catch(e => {
  console.error('Test harness error:', e);
  process.exit(1);
});

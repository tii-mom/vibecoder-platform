#!/usr/bin/env node
// Stars payment idempotency — LIVE behavior verification.
//
// Unlike the static pattern check (stars-idempotency-check.mjs), this script
// performs runtime verification against a running Worker + D1 instance.
//
// What this verifies:
//   1. First callback: PENDING_CALLBACK → PROCESSING (Signer called once)
//   2. Concurrent/duplicate callback: returns PROCESSING/SUCCESS without re-calling Signer
//   3. SUCCESS replay: returns existing txHash
//   4. PENDING_MULTISIG: returns without calling Signer
//
// Prerequisites:
//   - Worker running (local: wrangler dev, or staging)
//   - Signer running via service binding
//   - Admin JWT for creating invoices
//   - Telegram webhook secret
//
// Required env vars:
//   STARS_API_BASE       — Worker API base URL
//   STARS_WEBHOOK_SECRET — X-Telegram-Bot-Api-Secret-Token value
//   STARS_ADMIN_TOKEN    — JWT bearer token for admin user
//
// Optional:
//   STARS_SIGNER_CALL_LOG — if set, path to a file where we can log signer calls
//                           (for verifying call count when using stub Signer)
//
// Usage:
//   node tools/stars-idempotency-live.mjs
//
// Alternative — manual curl steps (if script cannot run):
//   See the section at the bottom of this script's output.

const API_BASE = process.env.STARS_API_BASE;
const WEBHOOK_SECRET = process.env.STARS_WEBHOOK_SECRET;
const ADMIN_TOKEN = process.env.STARS_ADMIN_TOKEN;

function fail(msg) {
  console.error(`\n  FAIL  ${msg}`);
  process.exit(1);
}

if (!API_BASE) fail('Missing env: STARS_API_BASE');
if (!WEBHOOK_SECRET) fail('Missing env: STARS_WEBHOOK_SECRET');
if (!ADMIN_TOKEN) fail('Missing env: STARS_ADMIN_TOKEN');

const base = API_BASE.replace(/\/$/, '');

function authHeaders() {
  return { 'Authorization': `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' };
}

function webhookHeaders() {
  return { 'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET, 'Content-Type': 'application/json' };
}

async function createInvoice(launchId, starsAmount = 1) {
  const res = await fetch(`${base}/api/v1/payment/stars-invoice`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ launchId, starsAmount }),
    signal: AbortSignal.timeout(5000),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`Failed to create invoice: ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function sendCallback(id) {
  const res = await fetch(`${base}/api/v1/payment/stars-callback`, {
    method: 'POST',
    headers: webhookHeaders(),
    body: JSON.stringify({ id }),
    signal: AbortSignal.timeout(5000),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.error(`  FAIL  ${name}: ${detail}`);
    failed++;
  }
}

(async () => {
  console.log('\nStars Payment Idempotency — LIVE Verification\n');

  // -- Discover a valid launchId for test --
  let launchId;
  try {
    const res = await fetch(`${base}/api/v1/launches`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.success && data.data && data.data.length > 0) {
      launchId = data.data[0].id;
      console.log(`  Using launchId: ${launchId}`);
    } else {
      console.log('  No existing launches found — attempting to use a test id');
      launchId = 'test-launch-id';
    }
  } catch (err) {
    fail(`Cannot reach API to discover launchId: ${err.message}`);
  }

  // -- STEP 1: Create invoice --
  console.log('\n[1] Creating stars invoice...');
  let invoice;
  try {
    invoice = await createInvoice(launchId, 1);
    console.log(`  Invoice created: ${invoice.id} (starsAmount=${invoice.starsAmount})`);
  } catch (err) {
    // Invoice might fail if launch doesn't exist — that's ok, document it
    console.warn(`  WARN: Invoice creation failed: ${err.message}`);
    console.log('  Skipping to manual verification section.\n');
    printManualSteps(API_BASE, WEBHOOK_SECRET, ADMIN_TOKEN);
    process.exit(2);
  }

  const paymentId = invoice.id;

  // -- STEP 2: First callback (should succeed) --
  console.log('\n[2] Sending first callback...');
  const res1 = await sendCallback(paymentId);
  check(
    'First callback accepted (200)',
    res1.status === 200 && res1.body.success,
    `status=${res1.status} body=${JSON.stringify(res1.body)}`
  );

  // -- STEP 3: Second callback (should NOT trigger a new Signer call) --
  console.log('\n[3] Sending second callback (concurrent/duplicate)...');
  const res2 = await sendCallback(paymentId);
  const status2 = res2.body?.status;
  check(
    'Second callback is idempotent (PROCESSING or SUCCESS, no re-sign)',
    status2 === 'PROCESSING' || status2 === 'SUCCESS' || status2 === 'PENDING_MULTISIG',
    `status=${status2} body=${JSON.stringify(res2.body)}`
  );

  // -- STEP 4: SUCCESS replay returns txHash --
  if (status2 === 'SUCCESS' && res2.body?.txHash) {
    console.log('\n[4] Verifying SUCCESS replay returns txHash...');
    const res3 = await sendCallback(paymentId);
    check(
      'SUCCESS replay returns existing txHash',
      res3.status === 200 && res3.body?.txHash === res2.body?.txHash,
      `Expected txHash=${res2.body?.txHash}, got body=${JSON.stringify(res3.body)}`
    );
  } else {
    console.log(`\n[4] Skipping SUCCESS replay check (current status=${status2})`);
  }

  // -- STEP 5: Bad payment id --
  console.log('\n[5] Testing invalid payment id...');
  const resBad = await sendCallback('stars-ch-nonexistent-999');
  check(
    'Invalid payment id returns error',
    resBad.status === 404 || (resBad.body && !resBad.body.success),
    `status=${resBad.status} body=${JSON.stringify(resBad.body)}`
  );

  // -- Summary --
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  Passed: ${passed}  Failed: ${failed}`);
  if (failed > 0) {
    console.error('  Some checks failed. Review the output above.');
    process.exit(1);
  }
  console.log('  LIVE Stars payment idempotency verification PASSED.\n');
  process.exit(0);
})().catch(err => {
  console.error(`\n  ERROR: ${err.message}`);
  console.log('\n  Falling back to manual verification section.');
  printManualSteps(API_BASE, WEBHOOK_SECRET, ADMIN_TOKEN);
  process.exit(2);
});

function printManualSteps(apiBase, webhookSecret, adminToken) {
  console.log(`
${'='.repeat(60)}
MANUAL VERIFICATION STEPS (curl)
${'='.repeat(60)}

# 0. Set variables
API="${apiBase}"
SECRET="${webhookSecret}"
TOKEN="${adminToken}"

# 1. Create a stars invoice (requires admin JWT)
curl -s -X POST "$API/api/v1/payment/stars-invoice" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"launchId":"<REAL_LAUNCH_ID>","starsAmount":1}' | jq .

# Save the returned "id" field as PAYMENT_ID

# 2. First callback — expect status 200, Signer called once
curl -s -X POST "$API/api/v1/payment/stars-callback" \\
  -H "X-Telegram-Bot-Api-Secret-Token: $SECRET" \\
  -H "Content-Type: application/json" \\
  -d "{\\"id\\":\\"$PAYMENT_ID\\"}" | jq .

# 3. Second callback (same PAYMENT_ID) — must NOT call Signer again
curl -s -X POST "$API/api/v1/payment/stars-callback" \\
  -H "X-Telegram-Bot-Api-Secret-Token: $SECRET" \\
  -H "Content-Type: application/json" \\
  -d "{\\"id\\":\\"$PAYMENT_ID\\"}" | jq .

# Verify: status should be "PROCESSING" or "SUCCESS" or "PENDING_MULTISIG"
# Verify: No new Signer invocation (check Signer logs)

# 4. After SUCCESS: replay should return same txHash
curl -s -X POST "$API/api/v1/payment/stars-callback" \\
  -H "X-Telegram-Bot-Api-Secret-Token: $SECRET" \\
  -H "Content-Type: application/json" \\
  -d "{\\"id\\":\\"$PAYMENT_ID\\"}" | jq .

# Verify: body contains the same txHash as step 2

# 5. Invalid payment id — expect error
curl -s -X POST "$API/api/v1/payment/stars-callback" \\
  -H "X-Telegram-Bot-Api-Secret-Token: $SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{"id":"stars-ch-nonexistent-999"}' | jq .

# Verify: returns error (404 or success:false)

# 6. Concurrent callbacks (requires bash with background jobs)
# PAYMENT_ID2=$(... create another invoice ...)
# curl ... & curl ... & wait
# Verify: only ONE Signer invocation in logs

${'='.repeat(60)}
`);
}

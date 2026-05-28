#!/usr/bin/env node
// Signer smoke test — verifies Worker → Signer service binding without signing or broadcasting.
// Usage:
//   node tools/signer-smoke.mjs
//
// Required env vars:
//   SMOKE_API_BASE   – Worker API base URL (e.g. http://localhost:8787 or https://api.72h.lol)
//   SMOKE_ADMIN_TOKEN – JWT bearer token for an admin-authenticated user
// Optional:
//   SMOKE_IS_PRODUCTION – set to "1" to enforce isMock:false (default: unset / development tolerant)

const API_BASE = process.env.SMOKE_API_BASE;
const ADMIN_TOKEN = process.env.SMOKE_ADMIN_TOKEN;
const IS_PRODUCTION = process.env.SMOKE_IS_PRODUCTION === '1';

function fail(msg) {
  console.error(`\n  FAIL  ${msg}`);
  process.exit(1);
}

if (!API_BASE) {
  fail('Missing env: SMOKE_API_BASE (e.g. export SMOKE_API_BASE=http://localhost:8787)');
}
if (!ADMIN_TOKEN) {
  fail('Missing env: SMOKE_ADMIN_TOKEN (JWT for an admin user)');
}

const url = `${API_BASE.replace(/\/$/, '')}/api/v1/admin/signer-smoke`;

try {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  });

  const body = await res.json();

  if (res.status === 403) {
    fail(`ADMIN_TOKEN is not recognized as admin (HTTP 403). Raw: ${JSON.stringify(body)}`);
  }

  if (!body.success) {
    fail(`Signer smoke failed: ${body.error || JSON.stringify(body)}`);
  }

  const data = body.data;
  console.log(`  OK   Signer reachable | network=${data?.network} isMock=${data?.isMock} canBroadcast=${data?.canBroadcast}`);

  if (data?.isMock === true) {
    if (IS_PRODUCTION) {
      fail('Signer is in mock mode, which is forbidden in production/staging (set SMOKE_IS_PRODUCTION=1).');
    }
    console.log(`  WARN Signer is in mock mode (allowed in development).`);
  } else {
    console.log(`  OK   Signer is NOT in mock mode.`);
  }

  console.log(`\n  PASS  Signer smoke test completed successfully.\n`);
  process.exit(0);
} catch (err) {
  fail(`Network or unexpected error: ${err.message}`);
}

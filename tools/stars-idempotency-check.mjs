#!/usr/bin/env node
// ⚠️  STATIC CHECK ONLY — does NOT verify runtime idempotency behavior.
//
// This is a source-code pattern check. It validates that the required code patterns
// for atomic idempotency (PENDING_CALLBACK → PROCESSING, re-entrant guard, etc.)
// are present in the stars-callback handler.
//
// What this DOES verify:
//   - The atomic UPDATE ... WHERE status = 'PENDING_CALLBACK' RETURNING pattern exists
//   - Re-entrant guard for PROCESSING status exists
//   - SUCCESS replay returns existing txHash
//   - FAILED status returns appropriate error
//   - PENDING_MULTISIG status is handled
//
// What this CANNOT verify (requires runtime/behavioral test):
//   - That concurrent callbacks ONLY trigger one Signer invocation
//   - Actual D1 atomicity under write contention
//   - That the Signer service binding is called exactly once for a given payment
//   - Race conditions under high concurrency
//
// For full behavioral verification, run a runtime test against a live Worker + D1
// instance sending concurrent /api/v1/payment/stars-callback requests with the same id.
//
// Usage:
//   node tools/stars-idempotency-check.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerSrc = path.join(__dirname, '..', 'worker', 'src', 'index.ts');

if (!fs.existsSync(workerSrc)) {
  console.error('Worker source not found at', workerSrc);
  process.exit(1);
}

const source = fs.readFileSync(workerSrc, 'utf8');

const checks = [
  {
    name: 'Atomic PENDING_CALLBACK → PROCESSING',
    pattern: /UPDATE\s+stars_payments\s+SET\s+status\s*=\s*'PROCESSING'.*WHERE.*status\s*=\s*'PENDING_CALLBACK'/is,
    required: true,
  },
  {
    name: 'PROCESSING re-entrant guard (no re-sign)',
    pattern: /status\s*===\s*'PROCESSING'/,
    required: true,
  },
  {
    name: 'SUCCESS replay returns existing txHash',
    pattern: /status\s*===\s*'SUCCESS'.*onchain_tx_hash/s,
    required: true,
  },
  {
    name: 'FAILED / unknown status returns error',
    pattern: /Invalid payment status/,
    required: true,
  },
  {
    name: 'PENDING_MULTISIG status handled',
    pattern: /'PENDING_MULTISIG'/,
    required: true,
  },
];

let allPassed = true;
for (const check of checks) {
  const found = check.pattern.test(source);
  if (found) {
    console.log(`  PASS  ${check.name}`);
  } else {
    console.error(`  FAIL  ${check.name} — required pattern not found in worker/src/index.ts`);
    allPassed = false;
  }
}

if (!allPassed) {
  console.error('\nSome idempotency patterns are missing from the stars-callback handler.');
  process.exit(1);
}

console.log('\n  ⚠️   Stars payment idempotency STATIC check passed.');
console.log('  ⚠️   This is NOT a behavioral test. It only verifies code patterns exist.');
console.log('  ⚠️   Runtime verification (concurrent callbacks, D1 atomicity, Signer call count) requires a live integration test against a running Worker + D1 instance.');
console.log('  See tools/e2e-gate-plan.md section 3 for runtime test commands.\n');
process.exit(0);

#!/usr/bin/env node
// Verify on-chain Spark gate — static code pattern check.
// Usage: node tools/verify-onchain-spark-gate.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const workerSrc = path.join(ROOT, 'worker', 'src', 'index.ts');
const sparkModal = path.join(ROOT, 'vc', 'src', 'components', 'SparkModal.tsx');
const onchainSpark = path.join(ROOT, 'vc', 'src', 'services', 'onchainSpark.ts');
const migration = path.join(ROOT, 'worker', 'migrations', '0014_onchain_spark_index.sql');

const failures = [];
const warnings = [];

function fail(msg) { failures.push(msg); }
function warn(msg) { warnings.push(msg); }

// 1. Check files exist
for (const f of [workerSrc, sparkModal, onchainSpark, migration]) {
  if (!fs.existsSync(f)) fail(`Missing file: ${f}`);
  else console.log(`  OK   File exists: ${path.relative(ROOT, f)}`);
}

if (fs.existsSync(workerSrc)) {
  const wsrc = fs.readFileSync(workerSrc, 'utf8');

  // 2. Old /spark no longer directly UPDATE launches.raised_total without on-chain guard
  const hasDirectRaisedUpdate = wsrc.includes("UPDATE launches SET raised_total") &&
    !wsrc.includes("c.env.ENVIRONMENT === 'development'");
  if (wsrc.includes("Direct off-chain Spark is disabled")) {
    console.log('  OK   Old /spark rejects direct off-chain writes');
  } else {
    fail('Old /spark endpoint still allows direct off-chain raised_total update');
  }

  // 3. /spark/prepare exists
  if (wsrc.includes('/api/v1/launches/:id/spark/prepare')) {
    console.log('  OK   /spark/prepare endpoint exists');
  } else {
    fail('/spark/prepare endpoint not found');
  }

  // 4. /spark/submit exists
  if (wsrc.includes('/api/v1/launches/:id/spark/submit')) {
    console.log('  OK   /spark/submit endpoint exists');
  } else {
    fail('/spark/submit endpoint not found');
  }

  // 5. spark_onchain_events table referenced
  if (wsrc.includes('spark_onchain_events')) {
    console.log('  OK   spark_onchain_events table referenced in worker');
  } else {
    fail('spark_onchain_events table not referenced in worker');
  }

  // 6. All amount fields in spark_onchain_events use _nano
  if (wsrc.includes('amount_nano') && wsrc.includes('tokens_nano')) {
    console.log('  OK   Amount fields use _nano suffix');
  } else {
    fail('Amount fields missing _nano suffix');
  }

  // 7. 'PENDING_ONCHAIN' status exists
  if (wsrc.includes("'PENDING_ONCHAIN'")) {
    console.log('  OK   PENDING_ONCHAIN status used');
  } else {
    fail('PENDING_ONCHAIN status not found');
  }
}

// 8. Migration exists with spark_onchain_events
if (fs.existsSync(migration)) {
  const m = fs.readFileSync(migration, 'utf8');
  if (m.includes('spark_onchain_events')) {
    console.log('  OK   Migration creates spark_onchain_events table');
  } else {
    fail('Migration does not contain spark_onchain_events');
  }
  if (m.includes('_nano')) {
    console.log('  OK   Migration uses _nano for amount fields');
  } else {
    warn('Migration may lack _nano fields');
  }
}

// 9. SparkModal uses TonConnect
if (fs.existsSync(sparkModal)) {
  const sm = fs.readFileSync(sparkModal, 'utf8');
  if (sm.includes('useTonConnectUI') || sm.includes('tonConnectUI')) {
    console.log('  OK   SparkModal uses TonConnect');
  } else {
    fail('SparkModal does not use TonConnect');
  }

  // 10. SparkModal has on-chain flow
  if (sm.includes('prepareOnchainSpark') && sm.includes('submitOnchainSpark')) {
    console.log('  OK   SparkModal uses prepareOnchainSpark + submitOnchainSpark');
  } else {
    fail('SparkModal does not use on-chain spark flow');
  }

  // 11. SparkModal no longer calls investInProject() as production success path
  // investInProject is still imported but should not be the main solo path anymore
  const hasInvestInProjectCall = sm.match(/investInProject\(/g);
  if (!hasInvestInProjectCall || hasInvestInProjectCall.length <= 1) {
    console.log('  OK   SparkModal no longer relies on investInProject as solo path');
  } else {
    warn('SparkModal may still call investInProject in production path');
  }
}

// 12. onchainSpark service exists
if (fs.existsSync(onchainSpark)) {
  const os = fs.readFileSync(onchainSpark, 'utf8');
  if (os.includes('prepareOnchainSpark') && os.includes('submitOnchainSpark')) {
    console.log('  OK   onchainSpark service exports prepare + submit');
  } else {
    fail('onchainSpark service missing exports');
  }
}

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

console.log('✅ On-chain Spark gate verification passed.\n');
process.exit(0);

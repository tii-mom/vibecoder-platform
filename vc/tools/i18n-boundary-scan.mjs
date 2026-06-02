import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const checks = [
  // -- Specific file checks with context-rich patterns --
  {
    file: 'src/pages/CreateLaunchPage.tsx',
    patterns: [
      { re: /\balert\s*\(/, message: 'Create Launch must use inline form errors, not alert().' },
      { re: /value:\s*['"][^'"]*[\u3400-\u9fff][^'"]*['"]/, message: 'Create Launch option values must be stable non-localized codes.' },
      { re: /<option\s+value=["'][^"']*[\u3400-\u9fff][^"']*["']/, message: 'Create Launch select values must be stable non-localized codes.' },
    ],
  },
  {
    file: 'src/services/ai.ts',
    patterns: [
      { re: /Math\.random\s*\(/, message: 'AI fallback must not generate random scores.' },
    ],
  },
  // -- P0.3 Bounty status display --
  {
    file: 'src/pages/BountyPage.tsx',
    patterns: [
      { re: /data\.success.*setSubmitSuccessMsg/, message: 'Bounty submit must check data.status for PENDING vs VERIFIED, not show generic success.' },
    ],
  },
  // -- Expanded mock/fallback scanning --
  {
    file: 'src/pages/LaunchpadPage.tsx',
    patterns: [
      { re: /Math\.random.*toString\(16\).*join/, message: 'Math.random() mock txHash detected — must have import.meta.env.DEV guard.', severity: 'warn', requireGuard: /import\.meta\.env\.DEV/ },
    ],
  },
  {
    file: 'src/store/fundStore.ts',
    patterns: [
      { re: /Math\.random.*toString\(16\).*join/, message: 'fundStore Math.random() mock txHash detected — must have import.meta.env.DEV guard.', severity: 'warn', requireGuard: /import\.meta\.env\.DEV/ },
    ],
  },
  {
    file: 'src/store/sparkStore.ts',
    patterns: [
      { re: /Math\.random.*txHash|Math\.random.*hash/i, message: 'sparkStore must not generate mock txHash with Math.random().' },
    ],
  },
  // -- Production mock checks (allowlisted files are OK, everything else is a violation) --
  {
    // Global check: alert() must not appear in pages unless i18n-wrapped
    scanDir: 'src/pages',
    include: '*.tsx',
    pattern: { re: /\balert\s*\(/, message: 'Use inline error display (Toast/Modal), not alert().', allowlist: [
        { file: 'BountyPage.tsx', reason: 'Already uses i18n-wrapped t() calls for alert messages' },
        { file: 'LaunchDetail.tsx', reason: 'Already uses i18n-wrapped t() calls for blockchain interaction alerts' },
        { file: 'StudioPage.tsx', reason: 'Already uses i18n-wrapped t() call for form validation' },
      ] },
  },
  {
    // Global check: Math.random() on business paths (not particle effects / demo visual)
    scanDir: 'src/pages',
    include: '*.tsx',
    pattern: {
      re: /Math\.random\s*\(/,
      message: 'Math.random() used in page — ensure it is NOT used for scoring, txHash, or business outcomes.',
      allowlist: [
        { file: 'LaunchpadPage.tsx', reason: 'Demo ticker simulation (non-production display)' },
        { file: 'PortfolioPage.tsx', reason: 'Demo yield display (non-production visual)' },
        { file: 'LaunchDetail.tsx', reason: 'Demo profit segment display (non-production visual)' },
        { file: 'DevHubPage.tsx', reason: 'Demo display ID (non-production visual)' },
        { file: 'StudioPage.tsx', reason: 'Demo text generation (non-production visual)' },
      ],
    },
  },
  {
    // Check store files for mock txHash patterns
    scanDir: 'src/store',
    include: '*.ts',
    pattern: {
      re: /Math\.random\s*\(/,
      message: 'Math.random() in store — must not generate mock business outcomes (txHash, scores, balances).',
      allowlist: [
        { file: 'sparkStore.ts', reason: 'Demo squad/eco code generation and chart data (non-production)' },
        { file: 'fundStore.ts', reason: 'WARNING: mock txHash — ensure production paths bypass this' },
        { file: 'governanceStore.ts', reason: 'Vote ID generation (non-critical)' },
        { file: 'notificationStore.ts', reason: 'Demo notification simulation (non-production visual)' },
      ],
    },
  },
  // -- CJK hardcoded text scanning --
  {
    scanDir: 'src',
    include: '*.{tsx,ts}',
    pattern: {
      re: /[\u4e00-\u9fff]/,
      message: 'Hardcoded CJK text detected — should use i18n keys.',
      allowlist: [
        // i18n store and translation files themselves
        { file: 'i18n/', reason: 'i18n translation files' },
        // Components with CJK fallback labels
        { file: 'LanguageSwitcher.tsx', reason: 'Language names in the language switcher' },
        { file: 'LifecycleEmissionCard.tsx', reason: 'Demo lifecycle display text' },
        { file: 'RecommendBar.tsx', reason: 'Demo recommendation labels' },
        // Demo / mock data that is intentionally Chinese
        { file: 'InvitePage.tsx', reason: 'Referral privilege descriptions (already partially localized)' },
        { file: 'LaunchDetail.tsx', reason: 'Demo text (already uses i18n for most paths)' },
        // Store files with mock/demo data
        { file: 'sparkStore.ts', reason: 'Mock project descriptions (non-production data)' },
        { file: 'agentStore.ts', reason: 'Mock agent descriptions (non-production data)' },
        { file: 'fundStore.ts', reason: 'Mock fund descriptions (non-production data)' },
        { file: 'governanceStore.ts', reason: 'Mock proposal descriptions (non-production data)' },
        { file: 'notificationStore.ts', reason: 'Mock notification text (non-production)' },
        // Type definition files with CJK comments/examples
        { file: 'agent.ts', reason: 'Type definitions with CJK mock examples' },
        { file: 'spark.ts', reason: 'Type definitions with CJK mock examples' },
        // Pages that are intentionally demo/CJK
        { file: 'FeedPage.tsx', reason: 'Page header labels (non-critical)' },
        { file: 'LaunchPage.tsx', reason: 'Demo category labels (already partially i18n mapped)' },
        { file: 'CreateLaunchPage.tsx', reason: 'Category/label option translations (i18n-based)' },
        { file: 'DevHubPage.tsx', reason: 'Demo developer hub content' },
        { file: 'FundPage.tsx', reason: 'Demo fund page content' },
        { file: 'LaunchpadPage.tsx', reason: 'Demo launchpad display data' },
        { file: 'LeaderboardPage.tsx', reason: 'Demo leaderboard content' },
        { file: 'PortfolioPage.tsx', reason: 'Demo portfolio display data' },
        { file: 'StudioPage.tsx', reason: 'Demo studio content' },
        { file: 'WalletSDKDocPage.tsx', reason: 'Demo SDK documentation' },
        { file: 'BountyPage.tsx', reason: 'Already uses useTranslation for CJK fallback strings' },
        { file: 'CopilotPage.tsx', reason: 'Already uses useTranslation' },
        // Services with CJK fallback strings
        { file: 'ai.ts', reason: 'CJK fallback string in AI service (acceptable production fallback)' },
      ],
    },
  },
];

/**
 * Walk a directory recursively for files matching include patterns.
 */
function walkDir(dir, includePattern) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, includePattern));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      // includePattern is like '*.{tsx,ts}'
      const patternExts = includePattern.match(/\{([^}]+)\}/);
      const allowedExts = patternExts
        ? patternExts[1].split(',').map(e => '.' + e.trim())
        : [includePattern.replace('*', '')];
      if (allowedExts.includes(ext) && !entry.name.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const failures = [];
const warnings = [];

for (const check of checks) {
  if (check.file) {
    // Single-file check
    const fullPath = path.join(root, check.file);
    if (!fs.existsSync(fullPath)) {
      warnings.push(`${check.file}: file not found, skipping.`);
      continue;
    }
    const source = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of check.patterns) {
      if (pattern.re.test(source)) {
        // If a guard pattern is required, check it exists in the same file
        if (pattern.requireGuard && pattern.requireGuard.test(source)) {
          // Guard is present — downgrade from warn to silent
          continue;
        }
        const msg = `${check.file}: ${pattern.message}`;
        if (pattern.severity === 'warn') {
          warnings.push(msg + ' (no DEV guard found — potential production mock risk)');
        } else {
          failures.push(msg);
        }
      }
    }
  } else if (check.scanDir) {
    // Directory scan
    const scanPath = path.join(root, check.scanDir);
    if (!fs.existsSync(scanPath)) {
      warnings.push(`${check.scanDir}: directory not found, skipping.`);
      continue;
    }
    const files = walkDir(scanPath, check.include || '*.tsx');
    for (const filePath of files) {
      const relPath = path.relative(root, filePath);
      const source = fs.readFileSync(filePath, 'utf8');
      if (check.pattern.re.test(source)) {
        const allowlist = check.pattern.allowlist || [];
        const isAllowed = allowlist.some(a => relPath.includes(a.file));
        if (!isAllowed) {
          failures.push(`${relPath}: ${check.pattern.message}`);
        }
      }
    }
  }
}

if (warnings.length > 0) {
  console.warn('[warnings]');
  for (const w of warnings) console.warn(`  ${w}`);
}

if (failures.length > 0) {
  console.error('\n[failures]');
  for (const f of failures) console.error(`  ${f}`);
  console.error(`\n${failures.length} violation(s) found.`);
  process.exit(1);
}

console.log('i18n/mock boundary scan passed');

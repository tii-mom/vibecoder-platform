import { spawnSync } from 'node:child_process';

if (process.env.SEED_DEMO_DATA !== 'true') {
  console.error('Refusing to seed demo data. Set SEED_DEMO_DATA=true to continue.');
  process.exit(1);
}

const args = ['d1', 'execute', 'vibecoder-db-new', '--file=./seeds/dev.sql'];

if (process.argv.includes('--local')) {
  args.push('--local');
}

const result = spawnSync('wrangler', args, {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);

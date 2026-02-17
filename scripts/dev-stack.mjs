#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const run = (cmd, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, ...options });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} failed with code ${code}`));
    });
  });

const cwd = process.cwd();
const envPath = path.join(cwd, '.env.local');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(
    envPath,
    [
      'DATABASE_URL="postgresql://brainbolt:brainbolt@localhost:5432/brainbolt?schema=public"',
      'REDIS_URL="redis://localhost:6379"',
      'NEXT_PUBLIC_BASE_URL="http://localhost:3000"',
      ''
    ].join('\n')
  );
  console.log('Created .env.local with default local values.');
}

const composeCmd = 'docker compose';

(async () => {
  try {
    console.log('\n▶ Starting postgres + redis in background...\n');
    await run(composeCmd, ['up', '-d', 'postgres', 'redis']);

    console.log('\n▶ Pushing Prisma schema...\n');
    await run('npx', ['prisma', 'db', 'push']);

    console.log('\n▶ Launching Next.js dev server...\n');
    await run('npm', ['run', 'dev']);
  } catch (err) {
    console.error('\n✖ dev-stack failed:', err.message);
    process.exit(1);
  }
})();

#!/usr/bin/env node
import { spawn } from 'node:child_process';

const child = spawn('docker compose', ['down'], { stdio: 'inherit', shell: true });
child.on('exit', (code) => process.exit(code ?? 1));

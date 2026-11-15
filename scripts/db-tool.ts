import { spawnSync } from 'node:child_process';
import path from 'node:path';

const command = process.argv[2];

if (command !== 'generate' && command !== 'migrate' && command !== 'push') {
	throw new Error('Usage: tsx scripts/db-tool.ts <generate|migrate|push>');
}

const provider = process.env.DB_PROVIDER;

if (provider !== 'postgres' && provider !== 'sqlite') {
	throw new Error('DB_PROVIDER must be "sqlite" or "postgres"');
}

const config = provider === 'postgres' ? 'drizzle.pg.config.ts' : 'drizzle.sqlite.config.ts';
const bin = path.join(process.cwd(), 'node_modules/drizzle-kit/bin.cjs');
const result = spawnSync(process.execPath, [bin, command, '--config', config], {
	stdio: 'inherit',
	env: process.env
});

process.exit(result.status ?? 1);

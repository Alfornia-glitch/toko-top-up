import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import postgres from 'postgres';

const provider = process.env.DB_PROVIDER;

if (provider === 'postgres') {
	// Prefer the direct/session connection for DDL; the runtime uses the
	// transaction pooler in DATABASE_URL, which cannot run prepared statements.
	const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

	if (!url) {
		throw new Error('DIRECT_URL or DATABASE_URL is required when DB_PROVIDER=postgres');
	}

	// Transaction-pooler connections (pgbouncer/port 6543) cannot use
	// server-side prepared statements, matching `createPostgresDb` in core.ts.
	const sql = postgres(url, { prepare: !isTransactionPooler(url) });

	try {
		await sql`CREATE SCHEMA IF NOT EXISTS auth_app`;
		await sql`CREATE SCHEMA IF NOT EXISTS shop`;
	} finally {
		await sql.end();
	}

	console.log('auth_app and shop schemas ready');
} else if (provider === 'sqlite') {
	const path = process.env.SQLITE_PATH || './data/ecommerce.sqlite';
	mkdirSync(dirname(path), { recursive: true });
	console.log(`sqlite directory ready: ${dirname(path)}`);
} else {
	throw new Error(
		'DB_PROVIDER must be "sqlite" or "postgres" (copy env.vps.example or env.supabase.example to .env)'
	);
}

function isTransactionPooler(url: string): boolean {
	if (/[?&]pgbouncer=true\b/.test(url)) return true;

	try {
		return new URL(url).port === '6543';
	} catch {
		return /:6543(?:[/?]|$)/.test(url);
	}
}

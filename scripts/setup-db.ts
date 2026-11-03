import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SQL } from 'bun';

const provider = process.env.DB_PROVIDER;

if (provider === 'postgres') {
	const url = process.env.DATABASE_URL;

	if (!url) {
		throw new Error('DATABASE_URL is required when DB_PROVIDER=postgres');
	}

	const sql = new SQL(url);

	try {
		await sql`CREATE SCHEMA IF NOT EXISTS auth_app`;
	} finally {
		await sql.close();
	}

	console.log('auth_app schema ready');
} else if (provider === 'sqlite') {
	const path = process.env.SQLITE_PATH || './data/ecommerce.sqlite';
	mkdirSync(dirname(path), { recursive: true });
	console.log(`sqlite directory ready: ${dirname(path)}`);
} else {
	throw new Error(
		'DB_PROVIDER must be "sqlite" or "postgres" (copy env.vps.example or env.supabase.example to .env)'
	);
}

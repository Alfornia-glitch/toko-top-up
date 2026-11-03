import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { drizzle as drizzlePostgres } from 'drizzle-orm/bun-sql';
import { drizzle as drizzleSqlite } from 'drizzle-orm/bun-sqlite';
import * as postgresSchema from './schema/postgres/index.ts';
import * as sqliteSchema from './schema/sqlite/index.ts';

/** Local, file-backed SQLite database used by the VPS deployment profile. */
export function createSqliteDb(path: string) {
	mkdirSync(dirname(path), { recursive: true });
	const db = drizzleSqlite(path, { schema: sqliteSchema });

	return { db };
}

/** Supabase Postgres connection used by the managed deployment profile. */
export function createPostgresDb(url: string) {
	const db = drizzlePostgres({
		// Transaction-pooler connections (pgbouncer/port 6543) cannot use
		// server-side prepared statements; session-pooler and direct
		// connections can.
		connection: { url, prepare: !isTransactionPooler(url) },
		schema: postgresSchema
	});

	return { db };
}

function isTransactionPooler(url: string): boolean {
	if (/[?&]pgbouncer=true\b/.test(url)) return true;

	try {
		return new URL(url).port === '6543';
	} catch {
		return /:6543(?:[/?]|$)/.test(url);
	}
}

export type SqliteDb = ReturnType<typeof createSqliteDb>['db'];
export type PostgresDb = ReturnType<typeof createPostgresDb>['db'];
export type Db = SqliteDb | PostgresDb;

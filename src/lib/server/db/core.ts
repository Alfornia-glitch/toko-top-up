import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as postgresSchema from './schema.pg.ts';
import type { SqliteDb } from './sqlite.ts';

/** Supabase Postgres connection used by the managed deployment profile. */
export function createPostgresDb(url: string) {
	// Transaction-pooler connections (pgbouncer/port 6543) cannot use
	// server-side prepared statements; session-pooler and direct
	// connections can.
	const client = postgres(url, { prepare: !isTransactionPooler(url) });
	const db = drizzlePostgres(client, { schema: postgresSchema });

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

export type { SqliteDb };
export type PostgresDb = ReturnType<typeof createPostgresDb>['db'];
export type Db = SqliteDb | PostgresDb;

import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as postgresSchema from './schema.pg.ts';
import type { SqliteDb } from './sqlite.ts';

/** Supabase Postgres connection used by the managed deployment profile. */
export function createPostgresDb(url: string) {
	// Transaction-pooler connections (pgbouncer/port 6543) cannot use
	// server-side prepared statements; session-pooler and direct
	// connections can.
	const transactionPooler = isTransactionPooler(url);
	const client = postgres(url, {
		prepare: !transactionPooler,
		// Pipelined queries on one connection hang behind a transaction pooler
		// (Supavisor/pgbouncer), so send one at a time per connection there.
		...(transactionPooler ? { max_pipeline: 1 } : {}),
		connect_timeout: 15,
		idle_timeout: 30
	});
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

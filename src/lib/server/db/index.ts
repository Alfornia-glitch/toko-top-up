import { DATABASE_URL, DB_PROVIDER, SQLITE_PATH } from '$app/env/private';
import { createPostgresDb, type Db } from './core.ts';

export type DbProvider = typeof DB_PROVIDER;

export const dbProvider: DbProvider = DB_PROVIDER;

function requireValue(name: string, value: string | undefined): string {
	if (!value) {
		throw new Error(`${name} must be set when DB_PROVIDER=${dbProvider}`);
	}

	return value;
}

// The SQLite driver is Bun-only, so load it lazily and only for the VPS profile.
export const db: Db =
	dbProvider === 'postgres'
		? createPostgresDb(requireValue('DATABASE_URL', DATABASE_URL)).db
		: (await import('./sqlite.ts')).createSqliteDb(SQLITE_PATH).db;

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

async function loadSqliteDb(): Promise<Db> {
	if (typeof Bun === 'undefined') {
		throw new Error(
			'DB_PROVIDER=sqlite needs the Bun runtime (bun:sqlite). Set DB_PROVIDER=postgres on Node hosts such as Netlify.'
		);
	}

	return (await import('./sqlite.ts')).createSqliteDb(SQLITE_PATH).db;
}

// The SQLite driver is Bun-only, so load it lazily and only for the VPS profile.
export const db: Db =
	dbProvider === 'postgres'
		? createPostgresDb(requireValue('DATABASE_URL', DATABASE_URL)).db
		: await loadSqliteDb();

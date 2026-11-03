import { DATABASE_URL, DB_PROVIDER, SQLITE_PATH } from '$app/env/private';
import { createPostgresDb, createSqliteDb, type Db } from './core.ts';

export type DbProvider = typeof DB_PROVIDER;

export const dbProvider: DbProvider = DB_PROVIDER;

function requireValue(name: string, value: string | undefined): string {
	if (!value) {
		throw new Error(`${name} must be set when DB_PROVIDER=${dbProvider}`);
	}

	return value;
}

export const db: Db =
	dbProvider === 'postgres'
		? createPostgresDb(requireValue('DATABASE_URL', DATABASE_URL)).db
		: createSqliteDb(SQLITE_PATH).db;

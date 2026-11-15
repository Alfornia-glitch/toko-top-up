import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import * as sqliteSchema from './schema.sqlite.ts';

/**
 * Local, file-backed SQLite database used by the VPS deployment profile.
 * Import it lazily so hosts running the Postgres profile never load the native module.
 */
export function createSqliteDb(path: string) {
	mkdirSync(dirname(path), { recursive: true });
	const db = drizzleSqlite(new Database(path), { schema: sqliteSchema });

	return { db };
}

export type SqliteDb = ReturnType<typeof createSqliteDb>['db'];

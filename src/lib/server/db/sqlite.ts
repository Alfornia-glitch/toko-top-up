import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { drizzle as drizzleSqlite } from 'drizzle-orm/bun-sqlite';
import * as sqliteSchema from './schema.sqlite.ts';

/**
 * Local, file-backed SQLite database used by the VPS deployment profile.
 * Bun-only: import it lazily so Node builds (e.g. Netlify) never resolve `bun:sqlite`.
 */
export function createSqliteDb(path: string) {
	mkdirSync(dirname(path), { recursive: true });
	const db = drizzleSqlite(path, { schema: sqliteSchema });

	return { db };
}

export type SqliteDb = ReturnType<typeof createSqliteDb>['db'];

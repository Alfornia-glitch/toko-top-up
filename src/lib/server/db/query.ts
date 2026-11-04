import { db, dbProvider } from './index.ts';
import * as postgres from './schema/postgres/index.ts';
import * as sqlite from './schema/sqlite/index.ts';
import type { PostgresDb } from './core.ts';

// The pg and SQLite schemas are logically identical (timestamps are Date,
// booleans are boolean, JSON columns carry the same `$type`), but Drizzle's
// two query builders are distinct types that TypeScript cannot unify. Use the
// Postgres dialect as the compile-time view for both providers so call sites
// get full column and result inference; the runtime objects stay provider-
// specific.
export const tables = (dbProvider === 'postgres' ? postgres : sqlite) as typeof postgres;

export const queryDb = db as PostgresDb;

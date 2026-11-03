import { db, dbProvider } from './index.ts';
import * as postgres from './schema/postgres/index.ts';
import * as sqlite from './schema/sqlite/index.ts';

export const tables = dbProvider === 'postgres' ? postgres : sqlite;

// Both providers expose the same Drizzle query-builder API; the cached union
// type of `Db` cannot be narrowed at runtime, so queries go through this alias.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const queryDb = db as any;

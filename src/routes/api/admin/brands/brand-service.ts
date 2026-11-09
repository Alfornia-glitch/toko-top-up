import { db, dbProvider } from '#db';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { createBrandService } from '#modules/catalog/server.ts';

export const brandService =
	dbProvider === 'postgres'
		? createBrandService({ provider: 'postgres', db: db as PostgresDb })
		: createBrandService({ provider: 'sqlite', db: db as SqliteDb });

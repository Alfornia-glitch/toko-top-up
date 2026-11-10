import { db, dbProvider } from '#db';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { createProductService } from '#modules/catalog/server.ts';

export const productService =
	dbProvider === 'postgres'
		? createProductService({ provider: 'postgres', db: db as PostgresDb })
		: createProductService({ provider: 'sqlite', db: db as SqliteDb });

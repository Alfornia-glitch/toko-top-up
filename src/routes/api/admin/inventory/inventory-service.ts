import { db, dbProvider } from '#db';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { createInventoryService } from '#modules/catalog/server.ts';

export const inventoryService =
	dbProvider === 'postgres'
		? createInventoryService({ provider: 'postgres', db: db as PostgresDb })
		: createInventoryService({ provider: 'sqlite', db: db as SqliteDb });

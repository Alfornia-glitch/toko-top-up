import { db, dbProvider } from '#db';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { createCategoryService } from '#modules/catalog/server.ts';

export const categoryService =
	dbProvider === 'postgres'
		? createCategoryService({ provider: 'postgres', db: db as PostgresDb })
		: createCategoryService({ provider: 'sqlite', db: db as SqliteDb });

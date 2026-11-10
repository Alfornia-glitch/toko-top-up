import type { Clock } from '#shared';
import { systemClock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import {
	createInventoryService as createService,
	type InventoryService
} from './application/inventory-service.ts';
import { createPostgresInventoryRepository } from './infra/pg/inventory-repository.ts';
import { createSqliteInventoryRepository } from './infra/sqlite/inventory-repository.ts';

type InventoryServiceOptions =
	| { provider: 'postgres'; db: PostgresDb; clock?: Clock }
	| { provider: 'sqlite'; db: SqliteDb; clock?: Clock };

export function createInventoryService(options: InventoryServiceOptions): InventoryService {
	const clock = options.clock ?? systemClock;

	if (options.provider === 'postgres') {
		return createService(createPostgresInventoryRepository(options.db), clock);
	}

	return createService(createSqliteInventoryRepository(options.db), clock);
}

export type { InventoryService };

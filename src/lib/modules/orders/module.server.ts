import { systemClock, type Clock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { createOrdersService, type OrdersService } from './application/orders-service.ts';
import type { OrdersUserDirectory } from './domain/orders.ts';
import { createPostgresOrdersRepository } from './infra/pg/orders-repository.ts';
import { createSqliteOrdersRepository } from './infra/sqlite/orders-repository.ts';

export interface OrdersServices {
	readonly orders: OrdersService;
}

type OrdersServiceOptions =
	| { provider: 'postgres'; db: PostgresDb; users: OrdersUserDirectory; clock?: Clock }
	| { provider: 'sqlite'; db: SqliteDb; users: OrdersUserDirectory; clock?: Clock };

export function createOrdersServices(options: OrdersServiceOptions): OrdersServices {
	const clock = options.clock ?? systemClock;
	const repository =
		options.provider === 'postgres'
			? createPostgresOrdersRepository(options.db)
			: createSqliteOrdersRepository(options.db);

	return { orders: createOrdersService(repository, options.users, clock) };
}

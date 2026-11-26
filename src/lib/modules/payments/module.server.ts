import { systemClock, type Clock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import type { OrdersServices } from '#modules/orders/server.ts';
import {
	createPaymentsService,
	type PaymentsHooks,
	type PaymentsService
} from './application/payments-service.ts';
import type { PaymentsConfig, ProofStorage } from './domain/payments.ts';
import { createPostgresPaymentsRepository } from './infra/pg/payments-repository.ts';
import { createSqlitePaymentsRepository } from './infra/sqlite/payments-repository.ts';

export interface PaymentsServices {
	readonly payments: PaymentsService;
}

interface Shared {
	orders: Pick<OrdersServices, 'orders'>;
	storage: ProofStorage;
	config: PaymentsConfig;
	hooks: PaymentsHooks;
	clock?: Clock;
}

type PaymentsServiceOptions =
	| ({ provider: 'postgres'; db: PostgresDb } & Shared)
	| ({ provider: 'sqlite'; db: SqliteDb } & Shared);

export function createPaymentsServices(options: PaymentsServiceOptions): PaymentsServices {
	const repository =
		options.provider === 'postgres'
			? createPostgresPaymentsRepository(options.db)
			: createSqlitePaymentsRepository(options.db);

	return {
		payments: createPaymentsService({
			repository,
			orders: options.orders,
			storage: options.storage,
			config: options.config,
			hooks: options.hooks,
			clock: options.clock ?? systemClock
		})
	};
}

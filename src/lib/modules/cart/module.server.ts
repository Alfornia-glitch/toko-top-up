import { systemClock, type Clock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import {
	createCartService,
	type CartDependencies,
	type CartService
} from './application/cart-service.ts';
import { createPostgresCartRepository } from './infra/pg/cart-repository.ts';
import { createSqliteCartRepository } from './infra/sqlite/cart-repository.ts';

export interface CartServices {
	readonly cart: CartService;
}

type CartServiceOptions = CartDependencies &
	(
		| { provider: 'postgres'; db: PostgresDb; clock?: Clock }
		| { provider: 'sqlite'; db: SqliteDb; clock?: Clock }
	);

export function createCartServices(options: CartServiceOptions): CartServices {
	const clock = options.clock ?? systemClock;
	const repository =
		options.provider === 'postgres'
			? createPostgresCartRepository(options.db)
			: createSqliteCartRepository(options.db);

	return {
		cart: createCartService(
			repository,
			{ catalog: options.catalog, marketing: options.marketing },
			clock
		)
	};
}

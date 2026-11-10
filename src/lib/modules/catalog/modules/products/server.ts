import type { Clock } from '#shared';
import { systemClock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import {
	createProductService as createService,
	type ProductService
} from './application/product-service.ts';
import { createPostgresProductRepository } from './infra/pg/product-repository.ts';
import { createSqliteProductRepository } from './infra/sqlite/product-repository.ts';

type ProductServiceOptions =
	| { provider: 'postgres'; db: PostgresDb; clock?: Clock }
	| { provider: 'sqlite'; db: SqliteDb; clock?: Clock };

export function createProductService(options: ProductServiceOptions): ProductService {
	const clock = options.clock ?? systemClock;

	if (options.provider === 'postgres') {
		return createService(createPostgresProductRepository(options.db), clock);
	}

	return createService(createSqliteProductRepository(options.db), clock);
}

export type { ProductService };

import type { Clock } from '#shared';
import { systemClock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import {
	createBrandService as createService,
	type BrandService
} from './application/brand-service.ts';
import { createPostgresBrandRepository } from './infra/pg/brand-repository.ts';
import { createSqliteBrandRepository } from './infra/sqlite/brand-repository.ts';

type BrandServiceOptions =
	| { provider: 'postgres'; db: PostgresDb; clock?: Clock }
	| { provider: 'sqlite'; db: SqliteDb; clock?: Clock };

export function createBrandService(options: BrandServiceOptions): BrandService {
	const clock = options.clock ?? systemClock;

	if (options.provider === 'postgres') {
		return createService(createPostgresBrandRepository(options.db), clock);
	}

	return createService(createSqliteBrandRepository(options.db), clock);
}

export type { BrandService };

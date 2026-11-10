import type { Clock } from '#shared';
import { systemClock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import {
	createCategoryService as createService,
	type CategoryService
} from './application/category-service.ts';
import { createPostgresCategoryRepository } from './infra/pg/category-repository.ts';
import { createSqliteCategoryRepository } from './infra/sqlite/category-repository.ts';

type CategoryServiceOptions =
	| { provider: 'postgres'; db: PostgresDb; clock?: Clock }
	| { provider: 'sqlite'; db: SqliteDb; clock?: Clock };

export function createCategoryService(options: CategoryServiceOptions): CategoryService {
	const clock = options.clock ?? systemClock;

	if (options.provider === 'postgres') {
		return createService(createPostgresCategoryRepository(options.db), clock);
	}

	return createService(createSqliteCategoryRepository(options.db), clock);
}

export type { CategoryService };

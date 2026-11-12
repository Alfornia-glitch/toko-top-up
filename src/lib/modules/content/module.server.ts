import { systemClock, type Clock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { createContentService, type ContentService } from './application/content-service.ts';
import { createReviewsService, type ReviewsService } from './application/reviews-service.ts';
import type { ReviewDirectory } from './domain/reviews.ts';
import { createPostgresContentRepository } from './infra/pg/content-repository.ts';
import { createPostgresReviewsRepository } from './infra/pg/reviews-repository.ts';
import { createSqliteContentRepository } from './infra/sqlite/content-repository.ts';
import { createSqliteReviewsRepository } from './infra/sqlite/reviews-repository.ts';

export interface ContentServices {
	readonly content: ContentService;
	readonly reviews: ReviewsService;
}

type ContentServiceOptions =
	| { provider: 'postgres'; db: PostgresDb; directory: ReviewDirectory; clock?: Clock }
	| { provider: 'sqlite'; db: SqliteDb; directory: ReviewDirectory; clock?: Clock };

export function createContentServices(options: ContentServiceOptions): ContentServices {
	const clock = options.clock ?? systemClock;
	const repository =
		options.provider === 'postgres'
			? createPostgresContentRepository(options.db)
			: createSqliteContentRepository(options.db);

	const reviewsRepository =
		options.provider === 'postgres'
			? createPostgresReviewsRepository(options.db)
			: createSqliteReviewsRepository(options.db);

	return {
		content: createContentService(repository, clock),
		reviews: createReviewsService(reviewsRepository, options.directory)
	};
}

import { systemClock, type Clock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { createContentService, type ContentService } from './application/content-service.ts';
import { createPostgresContentRepository } from './infra/pg/content-repository.ts';
import { createSqliteContentRepository } from './infra/sqlite/content-repository.ts';

export interface ContentServices {
	readonly content: ContentService;
}

type ContentServiceOptions =
	| { provider: 'postgres'; db: PostgresDb; clock?: Clock }
	| { provider: 'sqlite'; db: SqliteDb; clock?: Clock };

export function createContentServices(options: ContentServiceOptions): ContentServices {
	const clock = options.clock ?? systemClock;
	const repository =
		options.provider === 'postgres'
			? createPostgresContentRepository(options.db)
			: createSqliteContentRepository(options.db);

	return { content: createContentService(repository, clock) };
}

import { systemClock, type Clock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { createMarketingService, type MarketingService } from './application/marketing-service.ts';
import { createPostgresMarketingRepository } from './infra/pg/marketing-repository.ts';
import { createSqliteMarketingRepository } from './infra/sqlite/marketing-repository.ts';

export interface MarketingServices {
	readonly marketing: MarketingService;
}

type MarketingServiceOptions =
	| { provider: 'postgres'; db: PostgresDb; clock?: Clock }
	| { provider: 'sqlite'; db: SqliteDb; clock?: Clock };

export function createMarketingServices(options: MarketingServiceOptions): MarketingServices {
	const clock = options.clock ?? systemClock;
	const repository =
		options.provider === 'postgres'
			? createPostgresMarketingRepository(options.db)
			: createSqliteMarketingRepository(options.db);

	return { marketing: createMarketingService(repository, clock) };
}

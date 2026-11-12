import { systemClock, type Clock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { createSupportService, type SupportService } from './application/support-service.ts';
import type { SupportUserDirectory } from './domain/support.ts';
import { createPostgresSupportRepository } from './infra/pg/support-repository.ts';
import { createSqliteSupportRepository } from './infra/sqlite/support-repository.ts';

export interface SupportServices {
	readonly support: SupportService;
}

type SupportServiceOptions =
	| { provider: 'postgres'; db: PostgresDb; users: SupportUserDirectory; clock?: Clock }
	| { provider: 'sqlite'; db: SqliteDb; users: SupportUserDirectory; clock?: Clock };

export function createSupportServices(options: SupportServiceOptions): SupportServices {
	const clock = options.clock ?? systemClock;
	const repository =
		options.provider === 'postgres'
			? createPostgresSupportRepository(options.db)
			: createSqliteSupportRepository(options.db);

	return { support: createSupportService(repository, options.users, clock) };
}

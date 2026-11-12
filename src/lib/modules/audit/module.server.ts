import { systemClock, type Clock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { createAuditService, type AuditService } from './application/audit-service.ts';
import { createPostgresAuditRepository } from './infra/pg/audit-repository.ts';
import { createSqliteAuditRepository } from './infra/sqlite/audit-repository.ts';

export interface AuditServices {
	readonly audit: AuditService;
}

type AuditServiceOptions =
	| { provider: 'postgres'; db: PostgresDb; clock?: Clock }
	| { provider: 'sqlite'; db: SqliteDb; clock?: Clock };

export function createAuditServices(options: AuditServiceOptions): AuditServices {
	const clock = options.clock ?? systemClock;
	const repository =
		options.provider === 'postgres'
			? createPostgresAuditRepository(options.db)
			: createSqliteAuditRepository(options.db);

	return { audit: createAuditService(repository, clock) };
}

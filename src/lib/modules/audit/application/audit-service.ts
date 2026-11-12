import {
	assertPermission,
	err,
	newId,
	ok,
	systemClock,
	toAppError,
	type Actor,
	type AppError,
	type Clock,
	type Result
} from '#shared';
import {
	DEFAULT_RETENTION_DAYS,
	type AuditEntry,
	type AuditListQuery,
	type AuditRecord,
	type AuditRepository
} from '../domain/audit.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

export interface AuditService {
	/** Service-to-service: any module or request handler may record an entry; no actor required. */
	record(entry: AuditEntry): Outcome<void>;

	list(
		query: AuditListQuery,
		actor: Actor | null
	): Outcome<{ data: AuditRecord[]; page: number; pageSize: number; total: number }>;
	count(actor: Actor | null): Outcome<number>;
	/** Removes entries older than `days` (default 90) and returns how many were deleted. */
	purgeOld(actor: Actor | null, days?: number): Outcome<number>;
}

export function createAuditService(
	repository: AuditRepository,
	clock: Clock = systemClock
): AuditService {
	async function run<T>(action: () => Promise<T>): Outcome<T> {
		try {
			return ok(await action());
		} catch (error) {
			return err(toAppError(error));
		}
	}

	return {
		record: (entry) =>
			run(async () => {
				await repository.insert({
					id: newId(),
					actorUserId: entry.actorUserId ?? null,
					action: entry.action,
					entityType: entry.entityType,
					entityId: entry.entityId ?? null,
					beforeJson: entry.before ?? null,
					afterJson: entry.after ?? null,
					ipAddress: entry.ipAddress ?? null,
					userAgent: entry.userAgent ?? null,
					createdAt: clock.now()
				});
			}),

		list: (query, actor) =>
			run(async () => {
				assertPermission(actor, 'super:access');
				const { data, total } = await repository.list(query);
				return { data, page: query.page, pageSize: query.pageSize, total };
			}),

		count: (actor) =>
			run(async () => {
				assertPermission(actor, 'super:access');
				return repository.count();
			}),

		purgeOld: (actor, days = DEFAULT_RETENTION_DAYS) =>
			run(async () => {
				assertPermission(actor, 'super:access');
				return repository.deleteOlderThan(new Date(clock.now().getTime() - days * 86_400_000));
			})
	};
}

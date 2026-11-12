import { and, count, desc, eq, like, lt, type SQL } from 'drizzle-orm';
import type { PostgresDb } from '#db/core.ts';
import type { AuditRepository } from '../../domain/audit.ts';
import { auditLog } from './schema.ts';

export function createPostgresAuditRepository(db: PostgresDb): AuditRepository {
	return {
		async insert(record) {
			await db.insert(auditLog).values(record);
		},

		async list(query) {
			const conditions: SQL[] = [];
			if (query.q) conditions.push(like(auditLog.action, `%${query.q}%`));
			if (query.status) conditions.push(eq(auditLog.entityType, query.status));
			const where = conditions.length ? and(...conditions) : undefined;

			const data = await db
				.select()
				.from(auditLog)
				.where(where)
				.orderBy(desc(auditLog.createdAt))
				.limit(query.pageSize)
				.offset((query.page - 1) * query.pageSize);
			const [row] = await db.select({ value: count() }).from(auditLog).where(where);

			return { data, total: Number(row?.value ?? 0) };
		},

		async count() {
			const [row] = await db.select({ value: count() }).from(auditLog);
			return Number(row?.value ?? 0);
		},

		async deleteOlderThan(cutoff) {
			const deleted = await db
				.delete(auditLog)
				.where(lt(auditLog.createdAt, cutoff))
				.returning({ id: auditLog.id });
			return deleted.length;
		}
	};
}

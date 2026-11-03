import { and, count, desc, eq, like, lt } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function listAuditLogs(query: {
	page: number;
	pageSize: number;
	q?: string;
	status?: string;
}) {
	const conditions = [];
	if (query.q) conditions.push(like(t.auditLog.action, `%${query.q}%`));
	if (query.status) conditions.push(eq(t.auditLog.entityType, query.status));
	const where = conditions.length ? and(...conditions) : undefined;
	const offset = (query.page - 1) * query.pageSize;

	const data = await queryDb
		.select()
		.from(t.auditLog)
		.where(where)
		.orderBy(desc(t.auditLog.createdAt))
		.limit(query.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb.select({ value: count() }).from(t.auditLog).where(where);
	return { data, page: query.page, pageSize: query.pageSize, total: Number(total ?? 0) };
}

export async function purgeOldAuditLogs(days = 90) {
	const cutoff = new Date(Date.now() - days * 86400000);
	const deleted = await queryDb
		.delete(t.auditLog)
		.where(lt(t.auditLog.createdAt, cutoff))
		.returning({ id: t.auditLog.id });
	return deleted.length;
}

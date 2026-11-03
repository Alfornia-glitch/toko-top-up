import { queryDb, tables } from '#db/query.ts';

export interface AuditEntry {
	actorUserId?: string | null;
	action: string;
	entityType: string;
	entityId?: string | null;
	before?: unknown;
	after?: unknown;
	ipAddress?: string | null;
	userAgent?: string | null;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
	await queryDb.insert(tables.auditLog).values({
		id: crypto.randomUUID(),
		actorUserId: entry.actorUserId ?? null,
		action: entry.action,
		entityType: entry.entityType,
		entityId: entry.entityId ?? null,
		beforeJson: entry.before ?? null,
		afterJson: entry.after ?? null,
		ipAddress: entry.ipAddress ?? null,
		userAgent: entry.userAgent ?? null,
		createdAt: new Date()
	});
}

export function auditRequest(
	event: { request: Request; getClientAddress: () => string },
	actorUserId: string | null | undefined,
	entry: Omit<AuditEntry, 'actorUserId' | 'ipAddress' | 'userAgent'>
): Promise<void> {
	return writeAudit({
		...entry,
		actorUserId,
		ipAddress: event.getClientAddress(),
		userAgent: event.request.headers.get('user-agent')
	});
}

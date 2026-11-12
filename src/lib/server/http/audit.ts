import { unwrap } from '#shared';
import type { AuditEntry } from '#modules/audit/index.ts';
import { getRuntime } from '#lib/server/runtime.server.ts';

export type { AuditEntry } from '#modules/audit/index.ts';

export async function writeAudit(entry: AuditEntry): Promise<void> {
	unwrap(await getRuntime().services.audit.audit.record(entry));
}

/** Records an audit entry for a request, filling in the actor, client address and user agent. */
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

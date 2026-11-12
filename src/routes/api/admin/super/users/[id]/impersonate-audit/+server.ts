import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/http/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';

export const POST: RequestHandler = async (event) => {
	const denied = requireSuperadmin(event.locals.user);
	if (denied) return denied;
	await auditRequest(event, event.locals.user!.id, {
		action: 'user.impersonate',
		entityType: 'user',
		entityId: event.params.id
	});
	return Response.json({ data: { ok: true } });
};

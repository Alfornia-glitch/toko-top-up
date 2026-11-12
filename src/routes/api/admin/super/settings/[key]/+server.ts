import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/http/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';
import { unwrap } from '#shared';

export const DELETE: RequestHandler = async (event) => {
	const denied = requireSuperadmin(event.locals.user);
	if (denied) return denied;
	unwrap(
		await event.locals.services.content.content.deleteSetting(event.params.key, event.locals.actor)
	);
	await auditRequest(event, event.locals.user!.id, {
		action: 'settings.delete',
		entityType: 'site_settings',
		entityId: event.params.key
	});
	return Response.json({ data: { key: event.params.key } });
};

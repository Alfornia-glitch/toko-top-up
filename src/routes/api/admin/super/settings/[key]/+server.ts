import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/modules/admin/access.ts';
import { auditRequest } from '#lib/server/modules/admin/audit.ts';
import { deleteSetting } from '#lib/server/modules/super/settings.ts';

export const DELETE: RequestHandler = async (event) => {
	const denied = requireSuperadmin(event.locals.user);
	if (denied) return denied;
	const deleted = await deleteSetting(event.params.key);
	if (!deleted) return Response.json({ error: 'Setting not found' }, { status: 404 });
	await auditRequest(event, event.locals.user!.id, {
		action: 'settings.delete',
		entityType: 'site_settings',
		entityId: event.params.key
	});
	return Response.json({ data: { key: event.params.key } });
};

import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/modules/admin/access.ts';
import { auditRequest } from '#lib/server/modules/admin/audit.ts';
import { settingsWriteSchema } from '#lib/server/modules/admin/validation.ts';
import { listSettings, putSettings } from '#lib/server/modules/super/settings.ts';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireSuperadmin(locals.user);
	if (denied) return denied;
	return Response.json({ data: await listSettings() });
};

export const PUT: RequestHandler = async (event) => {
	const denied = requireSuperadmin(event.locals.user);
	if (denied) return denied;
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}
	const parsed = settingsWriteSchema.safeParse(body);
	if (!parsed.success) return Response.json({ error: 'Invalid settings payload' }, { status: 422 });
	const data = await putSettings(parsed.data, event.locals.user!.id);
	await auditRequest(event, event.locals.user!.id, {
		action: 'settings.update',
		entityType: 'site_settings',
		after: parsed.data
	});
	return Response.json({ data });
};

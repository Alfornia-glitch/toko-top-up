import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/modules/admin/access.ts';
import { auditRequest } from '#lib/server/modules/admin/audit.ts';
import { superBanSchema } from '#lib/server/modules/admin/validation.ts';
import { assertNotSelf, banUser, unbanUser } from '#lib/server/modules/super/users.ts';
import { catalogErrorResponse } from '#lib/server/modules/catalog/http.ts';

export const POST: RequestHandler = async (event) => {
	const denied = requireSuperadmin(event.locals.user);
	if (denied) return denied;
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}
	const parsed = superBanSchema.safeParse(body);
	if (!parsed.success) return Response.json({ error: 'Invalid ban data' }, { status: 422 });
	try {
		assertNotSelf(event.locals.user!.id, event.params.id);
		const user = await banUser(event.params.id, parsed.data.reason, parsed.data.expiresAt);
		if (!user) return Response.json({ error: 'User not found' }, { status: 404 });
		await auditRequest(event, event.locals.user!.id, {
			action: 'user.ban',
			entityType: 'user',
			entityId: user.id,
			after: parsed.data
		});
		return Response.json({ data: user });
	} catch (error) {
		return catalogErrorResponse(error, 'ban user');
	}
};

export const DELETE: RequestHandler = async (event) => {
	const denied = requireSuperadmin(event.locals.user);
	if (denied) return denied;
	try {
		const user = await unbanUser(event.params.id);
		if (!user) return Response.json({ error: 'User not found' }, { status: 404 });
		await auditRequest(event, event.locals.user!.id, {
			action: 'user.unban',
			entityType: 'user',
			entityId: user.id
		});
		return Response.json({ data: user });
	} catch (error) {
		return catalogErrorResponse(error, 'unban user');
	}
};

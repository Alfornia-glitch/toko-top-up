import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/http/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';
import { superRoleSchema } from '#lib/server/http/admin-validation.ts';
import { assertNotSelf, setRole } from '#lib/server/platform/accounts.ts';
import { apiErrorResponse } from '#lib/server/http/api-error.ts';

export const PATCH: RequestHandler = async (event) => {
	const denied = requireSuperadmin(event.locals.user);
	if (denied) return denied;
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}
	const parsed = superRoleSchema.safeParse(body);
	if (!parsed.success) return Response.json({ error: 'Invalid role' }, { status: 422 });
	try {
		assertNotSelf(event.locals.user!.id, event.params.id);
		const user = await setRole(event.params.id, parsed.data.role);
		if (!user) return Response.json({ error: 'User not found' }, { status: 404 });
		await auditRequest(event, event.locals.user!.id, {
			action: 'user.set_role',
			entityType: 'user',
			entityId: user.id,
			after: { role: user.role }
		});
		return Response.json({ data: user });
	} catch (error) {
		return apiErrorResponse(error, 'set user role');
	}
};

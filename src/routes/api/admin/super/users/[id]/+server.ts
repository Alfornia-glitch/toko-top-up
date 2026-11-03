import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/modules/admin/access.ts';
import { getUser } from '#lib/server/modules/super/users.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireSuperadmin(locals.user);
	if (denied) return denied;
	const user = await getUser(params.id);
	if (!user) return Response.json({ error: 'User not found' }, { status: 404 });
	return Response.json({ data: user });
};

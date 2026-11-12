import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/http/access.ts';
import { listAdmins } from '#lib/server/platform/accounts.ts';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireSuperadmin(locals.user);
	if (denied) return denied;
	return Response.json({ data: await listAdmins() });
};

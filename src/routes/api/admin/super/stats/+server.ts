import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/http/access.ts';
import { superStats } from '#lib/server/platform/system.ts';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireSuperadmin(locals.user);
	if (denied) return denied;
	return Response.json({ data: await superStats(locals.actor) });
};

import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/http/access.ts';
import { unwrap } from '#shared';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireSuperadmin(locals.user);
	if (denied) return denied;
	return Response.json({
		data: unwrap(await locals.services.content.content.getMediaStats(locals.actor))
	});
};

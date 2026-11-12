import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/http/access.ts';
import { unwrap } from '#shared';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;
	return Response.json({
		data: unwrap(await locals.services.reporting.commerce.inventoryReport(locals.actor))
	});
};

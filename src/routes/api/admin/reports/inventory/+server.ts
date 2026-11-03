import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { inventoryReport } from '#lib/server/modules/reports/reports.ts';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;
	return Response.json({ data: await inventoryReport() });
};

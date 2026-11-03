import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { reportRangeSchema } from '#lib/server/modules/admin/validation.ts';
import { salesReport } from '#lib/server/modules/reports/reports.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;
	const parsed = reportRangeSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) return Response.json({ error: 'Invalid range' }, { status: 400 });
	return Response.json({ data: await salesReport(parsed.data.from, parsed.data.to) });
};

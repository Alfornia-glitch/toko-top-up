import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/http/access.ts';
import { reportRangeSchema } from '#lib/server/http/admin-validation.ts';
import { unwrap } from '#shared';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;
	const parsed = reportRangeSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) return Response.json({ error: 'Invalid range' }, { status: 400 });
	return Response.json({
		data: unwrap(await locals.services.reporting.commerce.salesReport(parsed.data, locals.actor))
	});
};

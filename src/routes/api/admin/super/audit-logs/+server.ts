import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/modules/admin/access.ts';
import { paginationSchema } from '#lib/server/modules/admin/validation.ts';
import { listAuditLogs } from '#lib/server/modules/super/audit-logs.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireSuperadmin(locals.user);
	if (denied) return denied;
	const parsed = paginationSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
	return Response.json(await listAuditLogs(parsed.data));
};

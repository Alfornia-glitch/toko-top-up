import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { returnListSchema } from '#lib/server/modules/admin/validation.ts';
import { listReturns } from '#lib/server/modules/orders/returns.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const parsed = returnListSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
	}

	return Response.json(await listReturns(parsed.data));
};

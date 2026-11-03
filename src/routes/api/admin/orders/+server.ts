import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { orderListSchema } from '#lib/server/modules/admin/validation.ts';
import { listOrders } from '#lib/server/modules/orders/orders.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const parsed = orderListSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
	}

	return Response.json(await listOrders(parsed.data));
};

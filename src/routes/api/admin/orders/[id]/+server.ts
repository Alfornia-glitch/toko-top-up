import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { orderUpdateSchema } from '#lib/server/modules/admin/validation.ts';
import { getOrder, updateOrder } from '#lib/server/modules/orders/orders.ts';
import { catalogErrorResponse } from '#lib/server/modules/catalog/http.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const order = await getOrder(params.id);
	if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

	return Response.json({ data: order });
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = orderUpdateSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid order update', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const order = await updateOrder(params.id, parsed.data, locals.user!.id);
		if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

		return Response.json({ data: order });
	} catch (error) {
		return catalogErrorResponse(error, 'update order');
	}
};

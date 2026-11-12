import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/http/access.ts';
import { orderUpdateSchema } from '#lib/server/http/admin-validation.ts';
import { unwrap } from '#shared';
import { apiErrorResponse } from '#lib/server/http/api-error.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const order = unwrap(await locals.services.orders.orders.getOrder(params.id, locals.actor));

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
		const order = unwrap(
			await locals.services.orders.orders.updateOrder(params.id, parsed.data, locals.actor)
		);

		return Response.json({ data: order });
	} catch (error) {
		return apiErrorResponse(error, 'update order');
	}
};

import type { RequestHandler } from './$types';
import { getOrder } from '#lib/server/modules/account/orders.ts';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		const order = await getOrder(locals.user!.id, params.number);
		if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

		return Response.json({ data: order });
	} catch (error) {
		return customerErrorResponse(error, 'get order');
	}
};

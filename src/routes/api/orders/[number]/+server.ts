import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		const order = unwrap(
			await locals.services.orders.orders.getMyOrder(params.number, locals.actor)
		);

		return Response.json({ data: order });
	} catch (error) {
		return customerErrorResponse(error, 'get order');
	}
};

import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { customerErrorResponse, requireUser } from '#lib/server/http/customer-response.ts';

/** `id` may be a payment id or an order id. Owner only; others get 404. */
export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		const data = unwrap(
			await locals.services.payments.payments.getMyPayment(params.id, locals.actor)
		);
		return Response.json({ data });
	} catch (error) {
		return customerErrorResponse(error, 'get payment');
	}
};

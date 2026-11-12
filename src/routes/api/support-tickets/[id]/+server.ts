import type { RequestHandler } from './$types';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';
import { unwrap } from '#shared';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		const ticket = unwrap(
			await locals.services.support.support.getMyTicket(params.id, locals.actor)
		);

		return Response.json({ data: ticket });
	} catch (error) {
		return customerErrorResponse(error, 'get support ticket');
	}
};

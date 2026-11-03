import type { RequestHandler } from './$types';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';
import { getTicket } from '#lib/server/modules/account/tickets.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		const ticket = await getTicket(locals.user!.id, params.id);
		if (!ticket) return Response.json({ error: 'Support ticket not found' }, { status: 404 });

		return Response.json({ data: ticket });
	} catch (error) {
		return customerErrorResponse(error, 'get support ticket');
	}
};

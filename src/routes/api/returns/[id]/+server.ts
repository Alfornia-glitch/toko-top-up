import type { RequestHandler } from './$types';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';
import { getReturn } from '#lib/server/modules/account/returns.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		const request = await getReturn(locals.user!.id, params.id);
		if (!request) return Response.json({ error: 'Return not found' }, { status: 404 });

		return Response.json({ data: request });
	} catch (error) {
		return customerErrorResponse(error, 'get return');
	}
};

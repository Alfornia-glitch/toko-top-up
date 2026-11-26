import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { requireAdmin } from '#lib/server/http/access.ts';
import { apiErrorResponse } from '#lib/server/http/api-error.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	try {
		const data = unwrap(
			await locals.services.payments.payments.getAdminDetail(params.id, locals.actor)
		);
		return Response.json({ data });
	} catch (error) {
		return apiErrorResponse(error, 'get payment');
	}
};

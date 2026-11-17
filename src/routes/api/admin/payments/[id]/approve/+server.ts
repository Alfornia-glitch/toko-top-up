import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { requireAdmin } from '#lib/server/http/access.ts';
import { apiErrorResponse } from '#lib/server/http/api-error.ts';

/** Idempotent: approving an already-paid payment succeeds without repeating fulfilment. */
export const POST: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	try {
		const data = unwrap(await locals.services.payments.payments.approve(params.id, locals.actor));
		return Response.json({ data });
	} catch (error) {
		return apiErrorResponse(error, 'approve payment');
	}
};

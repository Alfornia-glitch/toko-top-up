import type { RequestHandler } from './$types';
import { z } from 'zod';
import { unwrap } from '#shared';
import { requireAdmin } from '#lib/server/http/access.ts';
import { apiErrorResponse } from '#lib/server/http/api-error.ts';

const querySchema = z.object({
	status: z
		.enum(['pending_payment', 'awaiting_verification', 'paid', 'rejected', 'expired'])
		.optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

/** Review queue, oldest first. */
export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid query', code: 'invalid_query', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const result = unwrap(
			await locals.services.payments.payments.listQueue(parsed.data, locals.actor)
		);
		return Response.json(result);
	} catch (error) {
		return apiErrorResponse(error, 'list payments');
	}
};

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { unwrap } from '#shared';
import { requireAdmin } from '#lib/server/http/access.ts';
import { apiErrorResponse } from '#lib/server/http/api-error.ts';

const rejectSchema = z.object({
	reason: z.enum(['wrong_amount', 'unreadable', 'no_matching_mutation', 'other']),
	note: z.string().trim().max(500).optional().nullable()
});

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const parsed = rejectSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return Response.json(
			{ error: 'A rejection reason is required', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const data = unwrap(
			await locals.services.payments.payments.reject(params.id, parsed.data, locals.actor)
		);
		return Response.json({ data });
	} catch (error) {
		return apiErrorResponse(error, 'reject payment');
	}
};

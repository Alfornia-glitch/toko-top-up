import type { RequestHandler } from './$types';
import { z } from 'zod';
import { unwrap } from '#shared';
import { customerErrorResponse, requireUser } from '#lib/server/http/customer-response.ts';

const createSchema = z.object({ orderId: z.string().min(1) });

/** Opens (or returns) the QRIS payment for one of the caller's own pending orders. */
export const POST: RequestHandler = async ({ locals, request }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	const parsed = createSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success)
		return Response.json(
			{ error: 'Expected { orderId }', code: 'VALIDATION_ERROR' },
			{ status: 422 }
		);

	try {
		const data = unwrap(
			await locals.services.payments.payments.createPayment(parsed.data.orderId, locals.actor)
		);
		return Response.json({ data }, { status: 201 });
	} catch (error) {
		return customerErrorResponse(error, 'create payment');
	}
};

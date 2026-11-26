import type { RequestHandler } from './$types';
import { timingSafeEqual } from 'node:crypto';
import { PAYMENT_EXPIRE_SECRET } from '$app/env/private';
import { unwrap } from '#shared';
import { apiErrorResponse } from '#lib/server/http/api-error.ts';

function matches(given: string, expected: string): boolean {
	const a = Buffer.from(given);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

/** Cron hook: expires lapsed unpaid payments, cancelling their orders and releasing stock. */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (
		!PAYMENT_EXPIRE_SECRET ||
		!matches(request.headers.get('x-cron-secret') ?? '', PAYMENT_EXPIRE_SECRET)
	) {
		return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
	}

	try {
		const data = unwrap(await locals.services.payments.payments.expireDue());
		return Response.json({ data });
	} catch (error) {
		return apiErrorResponse(error, 'expire payments');
	}
};

import { z } from 'zod';
import type { RequestHandler } from './$types';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';
import { unwrap } from '#shared';

const newsletterStatusSchema = z.object({
	status: z.enum(['subscribed', 'unsubscribed'])
});

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		const subscription = unwrap(
			await locals.services.marketing.marketing.getMySubscription(locals.user!.email, locals.actor)
		);
		return Response.json({ data: subscription });
	} catch (error) {
		return customerErrorResponse(error, 'get newsletter subscription');
	}
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = newsletterStatusSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid newsletter status', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const subscription = unwrap(
			await locals.services.marketing.marketing.setMySubscriptionStatus(
				parsed.data.status,
				locals.actor
			)
		);

		return Response.json({ data: subscription });
	} catch (error) {
		return customerErrorResponse(error, 'update newsletter subscription');
	}
};

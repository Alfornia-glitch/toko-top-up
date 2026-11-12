import type { RequestHandler } from './$types';
import { customerErrorResponse, requireUser } from '#lib/server/http/customer-response.ts';
import { ticketMessageSchema } from '#lib/server/http/customer-validation.ts';
import { unwrap } from '#shared';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = ticketMessageSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid message', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const message = unwrap(
			await locals.services.support.support.addMyMessage(params.id, parsed.data.body, locals.actor)
		);

		return Response.json({ data: message }, { status: 201 });
	} catch (error) {
		return customerErrorResponse(error, 'add support ticket message');
	}
};

import type { RequestHandler } from './$types';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';
import { ticketMessageSchema } from '#lib/server/modules/customer/validation.ts';
import { addMessage } from '#lib/server/modules/account/tickets.ts';

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
		const message = await addMessage(locals.user!.id, params.id, parsed.data.body);
		if (!message) return Response.json({ error: 'Support ticket not found' }, { status: 404 });

		return Response.json({ data: message }, { status: 201 });
	} catch (error) {
		return customerErrorResponse(error, 'add support ticket message');
	}
};

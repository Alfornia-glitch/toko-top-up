import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/http/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';
import { supportUpdateSchema } from '#lib/server/http/admin-validation.ts';
import { unwrap } from '#shared';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;
	const ticket = unwrap(await locals.services.support.support.getTicket(params.id, locals.actor));
	return Response.json({ data: ticket });
};

export const PATCH: RequestHandler = async (event) => {
	const denied = requireAdmin(event.locals.user);
	if (denied) return denied;
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json(
			{ error: 'Expected a JSON body', code: 'invalid_json_body' },
			{ status: 400 }
		);
	}
	const parsed = supportUpdateSchema.safeParse(body);
	if (!parsed.success)
		return Response.json(
			{ error: 'Invalid ticket update', code: 'VALIDATION_ERROR' },
			{ status: 422 }
		);
	const ticket = unwrap(
		await event.locals.services.support.support.updateTicket(
			event.params.id,
			parsed.data,
			event.locals.actor
		)
	);
	await auditRequest(event, event.locals.user!.id, {
		action: 'ticket.update',
		entityType: 'support_ticket',
		entityId: ticket.id,
		after: parsed.data
	});
	return Response.json({ data: ticket });
};

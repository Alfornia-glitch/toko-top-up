import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/http/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';
import { supportMessageSchema } from '#lib/server/http/admin-validation.ts';
import { unwrap } from '#shared';

export const POST: RequestHandler = async (event) => {
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
	const parsed = supportMessageSchema.safeParse(body);
	if (!parsed.success)
		return Response.json({ error: 'Invalid message', code: 'VALIDATION_ERROR' }, { status: 422 });
	const ticket = unwrap(
		await event.locals.services.support.support.addAdminMessage(
			event.params.id,
			parsed.data.body,
			parsed.data.attachmentsJson,
			event.locals.actor
		)
	);
	await auditRequest(event, event.locals.user!.id, {
		action: 'ticket.message',
		entityType: 'support_ticket',
		entityId: event.params.id
	});
	return Response.json({ data: ticket }, { status: 201 });
};

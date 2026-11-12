import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { auditRequest } from '#lib/server/modules/admin/audit.ts';
import { supportMessageSchema } from '#lib/server/modules/admin/validation.ts';
import { unwrap } from '#shared';

export const POST: RequestHandler = async (event) => {
	const denied = requireAdmin(event.locals.user);
	if (denied) return denied;
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}
	const parsed = supportMessageSchema.safeParse(body);
	if (!parsed.success) return Response.json({ error: 'Invalid message' }, { status: 422 });
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

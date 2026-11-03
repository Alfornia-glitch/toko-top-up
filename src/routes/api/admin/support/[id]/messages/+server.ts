import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { auditRequest } from '#lib/server/modules/admin/audit.ts';
import { supportMessageSchema } from '#lib/server/modules/admin/validation.ts';
import { addTicketMessage, getTicket } from '#lib/server/modules/support/tickets.ts';

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
	const result = await addTicketMessage(
		event.params.id,
		event.locals.user!.id,
		parsed.data.body,
		parsed.data.attachmentsJson
	);
	if (!result) return Response.json({ error: 'Ticket not found' }, { status: 404 });
	await auditRequest(event, event.locals.user!.id, {
		action: 'ticket.message',
		entityType: 'support_ticket',
		entityId: event.params.id
	});
	const ticket = await getTicket(event.params.id);
	return Response.json({ data: ticket }, { status: 201 });
};

import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { auditRequest } from '#lib/server/modules/admin/audit.ts';
import { giftCardUpdateSchema } from '#lib/server/modules/admin/validation.ts';
import { getGiftCard, updateGiftCard } from '#lib/server/modules/marketing/gift-cards.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;
	const card = await getGiftCard(params.id);
	if (!card) return Response.json({ error: 'Gift card not found' }, { status: 404 });
	return Response.json({ data: card });
};

export const PATCH: RequestHandler = async (event) => {
	const denied = requireAdmin(event.locals.user);
	if (denied) return denied;
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}
	const parsed = giftCardUpdateSchema.safeParse(body);
	if (!parsed.success) return Response.json({ error: 'Invalid gift card update' }, { status: 422 });
	const card = await updateGiftCard(event.params.id, parsed.data);
	if (!card) return Response.json({ error: 'Gift card not found' }, { status: 404 });
	await auditRequest(event, event.locals.user!.id, {
		action: 'gift_card.update',
		entityType: 'gift_card',
		entityId: event.params.id,
		after: parsed.data
	});
	return Response.json({ data: card });
};

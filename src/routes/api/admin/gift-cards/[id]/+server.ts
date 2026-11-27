import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/http/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';
import { giftCardUpdateSchema } from '#lib/server/http/admin-validation.ts';
import { unwrap } from '#shared';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;
	const card = unwrap(
		await locals.services.marketing.marketing.getGiftCard(params.id, locals.actor)
	);
	return Response.json({ data: card });
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
	const parsed = giftCardUpdateSchema.safeParse(body);
	if (!parsed.success)
		return Response.json(
			{ error: 'Invalid gift card update', code: 'VALIDATION_ERROR' },
			{ status: 422 }
		);
	const card = unwrap(
		await event.locals.services.marketing.marketing.updateGiftCard(
			event.params.id,
			parsed.data,
			event.locals.actor
		)
	);
	await auditRequest(event, event.locals.user!.id, {
		action: 'gift_card.update',
		entityType: 'gift_card',
		entityId: event.params.id,
		after: parsed.data
	});
	return Response.json({ data: card });
};

import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/http/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';
import { newsletterUpdateSchema } from '#lib/server/http/admin-validation.ts';
import { unwrap } from '#shared';

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
	const parsed = newsletterUpdateSchema.safeParse(body);
	if (!parsed.success)
		return Response.json(
			{ error: 'Invalid subscription update', code: 'VALIDATION_ERROR' },
			{ status: 422 }
		);
	const row = unwrap(
		await event.locals.services.marketing.marketing.setSubscriptionStatus(
			event.params.id,
			parsed.data.status,
			event.locals.actor
		)
	);
	await auditRequest(event, event.locals.user!.id, {
		action: 'newsletter.status',
		entityType: 'newsletter',
		entityId: row.id,
		after: { status: row.status }
	});
	return Response.json({ data: row });
};

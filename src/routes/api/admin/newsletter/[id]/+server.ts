import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { auditRequest } from '#lib/server/modules/admin/audit.ts';
import { newsletterUpdateSchema } from '#lib/server/modules/admin/validation.ts';
import { setNewsletterStatus } from '#lib/server/modules/marketing/newsletter.ts';

export const PATCH: RequestHandler = async (event) => {
	const denied = requireAdmin(event.locals.user);
	if (denied) return denied;
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}
	const parsed = newsletterUpdateSchema.safeParse(body);
	if (!parsed.success)
		return Response.json({ error: 'Invalid subscription update' }, { status: 422 });
	const row = await setNewsletterStatus(event.params.id, parsed.data.status);
	if (!row) return Response.json({ error: 'Subscription not found' }, { status: 404 });
	await auditRequest(event, event.locals.user!.id, {
		action: 'newsletter.status',
		entityType: 'newsletter',
		entityId: row.id,
		after: { status: row.status }
	});
	return Response.json({ data: row });
};

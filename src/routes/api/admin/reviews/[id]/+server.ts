import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { auditRequest } from '#lib/server/modules/admin/audit.ts';
import { reviewUpdateSchema } from '#lib/server/modules/admin/validation.ts';
import { setReviewStatus } from '#lib/server/modules/content/reviews.ts';

export const PATCH: RequestHandler = async (event) => {
	const denied = requireAdmin(event.locals.user);
	if (denied) return denied;
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}
	const parsed = reviewUpdateSchema.safeParse(body);
	if (!parsed.success) return Response.json({ error: 'Invalid review update' }, { status: 422 });
	const review = await setReviewStatus(event.params.id, parsed.data.status);
	if (!review) return Response.json({ error: 'Review not found' }, { status: 404 });
	await auditRequest(event, event.locals.user!.id, {
		action: 'review.status',
		entityType: 'review',
		entityId: review.id,
		after: { status: review.status }
	});
	return Response.json({ data: review });
};

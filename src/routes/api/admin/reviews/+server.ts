import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/http/access.ts';
import { reviewListSchema } from '#lib/server/http/admin-validation.ts';
import { unwrap } from '#shared';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;
	const parsed = reviewListSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
	return Response.json(
		unwrap(await locals.services.content.reviews.listReviews(parsed.data, locals.actor))
	);
};

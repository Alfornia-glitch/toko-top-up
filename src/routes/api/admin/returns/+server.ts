import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/http/access.ts';
import { returnListSchema } from '#lib/server/http/admin-validation.ts';
import { unwrap } from '#shared';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const parsed = returnListSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid query parameters', code: 'invalid_query' },
			{ status: 400 }
		);
	}

	return Response.json(
		unwrap(await locals.services.orders.returns.listReturns(parsed.data, locals.actor))
	);
};

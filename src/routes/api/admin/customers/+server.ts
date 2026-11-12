import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { customerListSchema } from '#lib/server/modules/admin/validation.ts';
import { unwrap } from '#shared';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const parsed = customerListSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
	}

	return Response.json(
		unwrap(await locals.services.customers.customers.listCustomers(parsed.data, locals.actor))
	);
};

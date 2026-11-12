import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { unwrap } from '#shared';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const customer = unwrap(
		await locals.services.customers.customers.getCustomer(params.id, locals.actor)
	);

	return Response.json({ data: customer });
};

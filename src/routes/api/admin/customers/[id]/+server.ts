import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { getCustomer } from '#lib/server/modules/customers/customers.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const customer = await getCustomer(params.id);
	if (!customer) return Response.json({ error: 'Customer not found' }, { status: 404 });

	return Response.json({ data: customer });
};

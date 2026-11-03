import type { RequestHandler } from './$types';
import { listOrders } from '#lib/server/modules/account/orders.ts';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';
import { paginationQuerySchema } from '#lib/server/modules/customer/validation.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	const parsed = paginationQuerySchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid query parameters', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const data = await listOrders(locals.user!.id, parsed.data.page, parsed.data.pageSize);
		return Response.json(data);
	} catch (error) {
		return customerErrorResponse(error, 'list orders');
	}
};

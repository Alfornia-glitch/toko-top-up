import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { customerErrorResponse, requireUser } from '#lib/server/http/customer-response.ts';
import { paginationQuerySchema } from '#lib/server/http/customer-validation.ts';

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
		const data = unwrap(
			await locals.services.orders.orders.listMyOrders(
				{ page: parsed.data.page, pageSize: parsed.data.pageSize },
				locals.actor
			)
		);
		return Response.json(data);
	} catch (error) {
		return customerErrorResponse(error, 'list orders');
	}
};

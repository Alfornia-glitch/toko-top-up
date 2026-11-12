import type { RequestHandler } from './$types';
import { customerErrorResponse, requireUser } from '#lib/server/http/customer-response.ts';
import { unwrap } from '#shared';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		return Response.json({
			data: unwrap(
				await locals.services.marketing.marketing.listMyGiftCards(locals.user!.email, locals.actor)
			)
		});
	} catch (error) {
		return customerErrorResponse(error, 'list gift cards');
	}
};

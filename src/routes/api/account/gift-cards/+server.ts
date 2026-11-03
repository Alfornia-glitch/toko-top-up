import type { RequestHandler } from './$types';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';
import { listGiftCards } from '#lib/server/modules/account/gift-cards.ts';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		return Response.json({ data: await listGiftCards(locals.user!.id) });
	} catch (error) {
		return customerErrorResponse(error, 'list gift cards');
	}
};

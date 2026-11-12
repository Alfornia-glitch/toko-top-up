import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { customerErrorResponse, requireUser } from '#lib/server/http/customer-response.ts';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		unwrap(
			await locals.services.storefront.storefront.removeFromWishlist(params.productId, locals.actor)
		);

		return Response.json({ ok: true });
	} catch (error) {
		return customerErrorResponse(error, 'remove wishlist item');
	}
};

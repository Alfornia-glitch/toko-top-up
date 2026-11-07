import type { RequestHandler } from './$types';
import { removeWishlist } from '#lib/server/modules/account/wishlist.ts';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		const removed = await removeWishlist(locals.user!.id, params.productId);
		if (!removed) return Response.json({ error: 'Wishlist item not found' }, { status: 404 });

		return Response.json({ ok: true });
	} catch (error) {
		return customerErrorResponse(error, 'remove wishlist item');
	}
};

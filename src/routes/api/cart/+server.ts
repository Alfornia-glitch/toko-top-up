import type { RequestHandler } from './$types';
import { clearCart, getCart } from '#lib/server/modules/cart/cart.ts';
import { resolveCartId } from '#lib/server/modules/cart/session-cart.ts';
import { customerErrorResponse } from '#lib/server/modules/customer/http.ts';

export const GET: RequestHandler = async ({ cookies, locals }) => {
	try {
		const cartId = await resolveCartId(cookies, locals.user?.id ?? null);
		return Response.json({ data: await getCart(cartId) });
	} catch (error) {
		return customerErrorResponse(error, 'get cart');
	}
};

export const DELETE: RequestHandler = async ({ cookies, locals }) => {
	try {
		const cartId = await resolveCartId(cookies, locals.user?.id ?? null);
		return Response.json({ data: await clearCart(cartId) });
	} catch (error) {
		return customerErrorResponse(error, 'clear cart');
	}
};

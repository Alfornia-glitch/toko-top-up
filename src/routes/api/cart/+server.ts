import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { resolveCartId } from '#lib/server/http/session-cart.ts';
import { customerErrorResponse } from '#lib/server/modules/customer/http.ts';

export const GET: RequestHandler = async ({ cookies, locals }) => {
	try {
		const cartId = await resolveCartId(cookies, locals.user?.id ?? null);
		return Response.json({ data: unwrap(await locals.services.cart.cart.getCart(cartId)) });
	} catch (error) {
		return customerErrorResponse(error, 'get cart');
	}
};

export const DELETE: RequestHandler = async ({ cookies, locals }) => {
	try {
		const cartId = await resolveCartId(cookies, locals.user?.id ?? null);
		return Response.json({ data: unwrap(await locals.services.cart.cart.clearCart(cartId)) });
	} catch (error) {
		return customerErrorResponse(error, 'clear cart');
	}
};

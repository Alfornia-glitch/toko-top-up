import type { RequestHandler } from './$types';
import { applyCoupon, removeCoupon } from '#lib/server/modules/cart/cart.ts';
import { resolveCartId } from '#lib/server/modules/cart/session-cart.ts';
import { customerErrorResponse } from '#lib/server/modules/customer/http.ts';
import { couponApplySchema } from '#lib/server/modules/customer/validation.ts';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = couponApplySchema.safeParse(body);
	if (!parsed.success)
		return Response.json(
			{ error: 'Invalid coupon data', details: parsed.error.flatten() },
			{ status: 422 }
		);

	try {
		const cartId = await resolveCartId(cookies, locals.user?.id ?? null);
		const cart = await applyCoupon(cartId, parsed.data.code);
		return Response.json({ data: cart });
	} catch (error) {
		return customerErrorResponse(error, 'apply coupon');
	}
};

export const DELETE: RequestHandler = async ({ cookies, locals }) => {
	try {
		const cartId = await resolveCartId(cookies, locals.user?.id ?? null);
		const cart = await removeCoupon(cartId);
		return Response.json({ data: cart });
	} catch (error) {
		return customerErrorResponse(error, 'remove coupon');
	}
};

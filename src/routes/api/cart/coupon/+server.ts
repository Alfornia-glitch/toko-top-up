import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { resolveCartId } from '#lib/server/http/session-cart.ts';
import { customerErrorResponse } from '#lib/server/http/customer-response.ts';
import { couponApplySchema } from '#lib/server/http/customer-validation.ts';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json(
			{ error: 'Expected a JSON body', code: 'invalid_json_body' },
			{ status: 400 }
		);
	}

	const parsed = couponApplySchema.safeParse(body);
	if (!parsed.success)
		return Response.json(
			{ error: 'Invalid coupon data', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
			{ status: 422 }
		);

	try {
		const cartId = await resolveCartId(cookies, locals.user?.id ?? null);
		const cart = unwrap(await locals.services.cart.cart.applyCoupon(cartId, parsed.data.code));
		return Response.json({ data: cart });
	} catch (error) {
		return customerErrorResponse(error, 'apply coupon');
	}
};

export const DELETE: RequestHandler = async ({ cookies, locals }) => {
	try {
		const cartId = await resolveCartId(cookies, locals.user?.id ?? null);
		const cart = unwrap(await locals.services.cart.cart.removeCoupon(cartId));
		return Response.json({ data: cart });
	} catch (error) {
		return customerErrorResponse(error, 'remove coupon');
	}
};

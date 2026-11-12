import type { RequestHandler } from './$types';
import { placeOrder } from '#lib/server/modules/checkout/checkout.ts';
import { resolveCartId } from '#lib/server/modules/cart/session-cart.ts';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';
import { checkoutSchema } from '#lib/server/modules/customer/validation.ts';
import { ConflictError } from '#shared';

export const POST: RequestHandler = async ({ locals, request, cookies }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = checkoutSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid checkout details', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const cartId = await resolveCartId(cookies, locals.user!.id);
		if (!cartId) throw new ConflictError('Your cart is empty');

		const data = await placeOrder(locals.actor!, cartId, parsed.data);

		return Response.json({ data }, { status: 201 });
	} catch (error) {
		return customerErrorResponse(error, 'place order');
	}
};

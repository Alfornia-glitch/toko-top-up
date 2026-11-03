import type { RequestHandler } from './$types';
import { removeItem, updateItem } from '#lib/server/modules/cart/cart.ts';
import { resolveCartId } from '#lib/server/modules/cart/session-cart.ts';
import { customerErrorResponse } from '#lib/server/modules/customer/http.ts';
import { cartUpdateSchema } from '#lib/server/modules/customer/validation.ts';

export const PATCH: RequestHandler = async ({ request, cookies, locals, params }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = cartUpdateSchema.safeParse(body);
	if (!parsed.success)
		return Response.json(
			{ error: 'Invalid cart item data', details: parsed.error.flatten() },
			{ status: 422 }
		);

	try {
		const cartId = await resolveCartId(cookies, locals.user?.id ?? null);
		const cart = await updateItem(cartId, params.id, parsed.data.quantity);
		return Response.json({ data: cart });
	} catch (error) {
		return customerErrorResponse(error, 'update cart item');
	}
};

export const DELETE: RequestHandler = async ({ cookies, locals, params }) => {
	try {
		const cartId = await resolveCartId(cookies, locals.user?.id ?? null);
		const cart = await removeItem(cartId, params.id);
		return Response.json({ data: cart });
	} catch (error) {
		return customerErrorResponse(error, 'remove cart item');
	}
};

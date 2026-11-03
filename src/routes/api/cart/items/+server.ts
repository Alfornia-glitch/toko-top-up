import type { RequestHandler } from './$types';
import { addItem } from '#lib/server/modules/cart/cart.ts';
import { resolveCartId } from '#lib/server/modules/cart/session-cart.ts';
import { customerErrorResponse } from '#lib/server/modules/customer/http.ts';
import { cartAddSchema } from '#lib/server/modules/customer/validation.ts';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = cartAddSchema.safeParse(body);
	if (!parsed.success)
		return Response.json(
			{ error: 'Invalid cart item data', details: parsed.error.flatten() },
			{ status: 422 }
		);

	try {
		const cartId = await resolveCartId(cookies, locals.user?.id ?? null);
		const cart = await addItem(cartId, parsed.data);
		return Response.json({ data: cart }, { status: 201 });
	} catch (error) {
		return customerErrorResponse(error, 'add cart item');
	}
};

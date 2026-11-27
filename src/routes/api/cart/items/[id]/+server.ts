import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { resolveCartId } from '#lib/server/http/session-cart.ts';
import { customerErrorResponse } from '#lib/server/http/customer-response.ts';
import { cartUpdateSchema } from '#lib/server/http/customer-validation.ts';

export const PATCH: RequestHandler = async ({ request, cookies, locals, params }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json(
			{ error: 'Expected a JSON body', code: 'invalid_json_body' },
			{ status: 400 }
		);
	}

	const parsed = cartUpdateSchema.safeParse(body);
	if (!parsed.success)
		return Response.json(
			{
				error: 'Invalid cart item data',
				code: 'VALIDATION_ERROR',
				details: parsed.error.flatten()
			},
			{ status: 422 }
		);

	try {
		const cartId = await resolveCartId(cookies, locals.user?.id ?? null);
		const cart = unwrap(
			await locals.services.cart.cart.updateItem(cartId, params.id, parsed.data.quantity)
		);
		return Response.json({ data: cart });
	} catch (error) {
		return customerErrorResponse(error, 'update cart item');
	}
};

export const DELETE: RequestHandler = async ({ cookies, locals, params }) => {
	try {
		const cartId = await resolveCartId(cookies, locals.user?.id ?? null);
		const cart = unwrap(await locals.services.cart.cart.removeItem(cartId, params.id));
		return Response.json({ data: cart });
	} catch (error) {
		return customerErrorResponse(error, 'remove cart item');
	}
};

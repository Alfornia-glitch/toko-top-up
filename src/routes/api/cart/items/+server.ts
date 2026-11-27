import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { resolveCartId } from '#lib/server/http/session-cart.ts';
import { customerErrorResponse } from '#lib/server/http/customer-response.ts';
import { cartAddSchema } from '#lib/server/http/customer-validation.ts';

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

	const parsed = cartAddSchema.safeParse(body);
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
		const cart = unwrap(await locals.services.cart.cart.addItem(cartId, parsed.data));
		return Response.json({ data: cart }, { status: 201 });
	} catch (error) {
		return customerErrorResponse(error, 'add cart item');
	}
};

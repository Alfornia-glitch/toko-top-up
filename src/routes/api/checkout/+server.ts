import type { RequestHandler } from './$types';
import { resolveCartId } from '#lib/server/http/session-cart.ts';
import { customerErrorResponse, requireUser } from '#lib/server/http/customer-response.ts';
import { checkoutSchema } from '#lib/server/http/customer-validation.ts';
import { ConflictError, unwrap } from '#shared';

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

		const data = unwrap(
			await locals.services.checkout.checkout.placeOrder(cartId, parsed.data, locals.actor)
		);

		return Response.json({ data }, { status: 201 });
	} catch (error) {
		return customerErrorResponse(error, 'place order');
	}
};

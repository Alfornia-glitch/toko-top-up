import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { customerErrorResponse, requireUser } from '#lib/server/http/customer-response.ts';
import { wishlistAddSchema } from '#lib/server/http/customer-validation.ts';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		return Response.json({
			data: unwrap(await locals.services.storefront.storefront.listWishlist(locals.actor))
		});
	} catch (error) {
		return customerErrorResponse(error, 'list wishlist');
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = wishlistAddSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid wishlist item', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const created = unwrap(
			await locals.services.storefront.storefront.addToWishlist(parsed.data.productId, locals.actor)
		);
		return Response.json({ data: created }, { status: 201 });
	} catch (error) {
		return customerErrorResponse(error, 'add wishlist item');
	}
};

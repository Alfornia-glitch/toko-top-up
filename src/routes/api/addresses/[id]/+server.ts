import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';
import { addressWriteSchema } from '#lib/server/modules/customer/validation.ts';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = addressWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid address data', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const data = unwrap(
			await locals.services.customers.customers.updateAddress(params.id, parsed.data, locals.actor)
		);

		return Response.json({ data });
	} catch (error) {
		return customerErrorResponse(error, 'update address');
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		unwrap(await locals.services.customers.customers.deleteAddress(params.id, locals.actor));

		return Response.json({ ok: true });
	} catch (error) {
		return customerErrorResponse(error, 'delete address');
	}
};

import type { RequestHandler } from './$types';
import { deleteAddress, updateAddress } from '#lib/server/modules/account/addresses.ts';
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
		const data = await updateAddress(locals.user!.id, params.id, parsed.data);
		if (!data) return Response.json({ error: 'Address not found' }, { status: 404 });

		return Response.json({ data });
	} catch (error) {
		return customerErrorResponse(error, 'update address');
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		const deleted = await deleteAddress(locals.user!.id, params.id);
		if (!deleted) return Response.json({ error: 'Address not found' }, { status: 404 });

		return Response.json({ ok: true });
	} catch (error) {
		return customerErrorResponse(error, 'delete address');
	}
};

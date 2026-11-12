import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';
import { addressWriteSchema } from '#lib/server/modules/customer/validation.ts';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		const data = unwrap(await locals.services.customers.customers.listAddresses(locals.actor));
		return Response.json({ data });
	} catch (error) {
		return customerErrorResponse(error, 'list addresses');
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

	const parsed = addressWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid address data', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const data = unwrap(
			await locals.services.customers.customers.createAddress(parsed.data, locals.actor)
		);
		return Response.json({ data }, { status: 201 });
	} catch (error) {
		return customerErrorResponse(error, 'create address');
	}
};

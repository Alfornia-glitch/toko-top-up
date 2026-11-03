import type { RequestHandler } from './$types';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';
import { returnCreateSchema } from '#lib/server/modules/customer/validation.ts';
import { createReturn, listReturns } from '#lib/server/modules/account/returns.ts';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		return Response.json({ data: await listReturns(locals.user!.id) });
	} catch (error) {
		return customerErrorResponse(error, 'list returns');
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

	const parsed = returnCreateSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid return request', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const created = await createReturn(locals.user!.id, parsed.data);
		return Response.json({ data: created }, { status: 201 });
	} catch (error) {
		return customerErrorResponse(error, 'create return');
	}
};

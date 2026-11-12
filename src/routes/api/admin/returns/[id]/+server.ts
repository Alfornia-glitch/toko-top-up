import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { returnUpdateSchema } from '#lib/server/modules/admin/validation.ts';
import { getReturn, updateReturn } from '#lib/server/modules/orders/orders.ts';
import { apiErrorResponse } from '#lib/server/http/api-error.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const request = await getReturn(params.id);
	if (!request) return Response.json({ error: 'Return not found' }, { status: 404 });

	return Response.json({ data: request });
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = returnUpdateSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid return update', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const updated = await updateReturn(params.id, parsed.data, locals.user!.id);
		if (!updated) return Response.json({ error: 'Return not found' }, { status: 404 });

		return Response.json({ data: updated });
	} catch (error) {
		return apiErrorResponse(error, 'update return');
	}
};

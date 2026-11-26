import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/http/access.ts';
import { shipmentCreateSchema } from '#lib/server/http/admin-validation.ts';
import { unwrap } from '#shared';
import { apiErrorResponse } from '#lib/server/http/api-error.ts';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json(
			{ error: 'Expected a JSON body', code: 'invalid_json_body' },
			{ status: 400 }
		);
	}

	const parsed = shipmentCreateSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid shipment data', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const result = unwrap(
			await locals.services.orders.orders.createShipment(params.id, parsed.data, locals.actor)
		);

		return Response.json({ data: result }, { status: 201 });
	} catch (error) {
		return apiErrorResponse(error, 'create shipment');
	}
};

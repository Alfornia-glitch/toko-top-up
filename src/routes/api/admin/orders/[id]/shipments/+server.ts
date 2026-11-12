import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { shipmentCreateSchema } from '#lib/server/modules/admin/validation.ts';
import { createShipment } from '#lib/server/modules/orders/orders.ts';
import { apiErrorResponse } from '#lib/server/http/api-error.ts';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = shipmentCreateSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid shipment data', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const result = await createShipment(params.id, parsed.data, locals.user!.id);
		if (!result) return Response.json({ error: 'Order not found' }, { status: 404 });

		return Response.json({ data: result }, { status: 201 });
	} catch (error) {
		return apiErrorResponse(error, 'create shipment');
	}
};

import type { RequestHandler } from './$types';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';
import { paymentMethodWriteSchema } from '#lib/server/modules/customer/validation.ts';
import { unwrap } from '#shared';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = paymentMethodWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid payment method', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const updated = unwrap(
			await locals.services.customers.customers.updatePaymentMethod(
				params.id,
				parsed.data,
				locals.actor
			)
		);

		return Response.json({ data: updated });
	} catch (error) {
		return customerErrorResponse(error, 'update payment method');
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		unwrap(await locals.services.customers.customers.deletePaymentMethod(params.id, locals.actor));

		return Response.json({ data: { id: params.id, deleted: true } });
	} catch (error) {
		return customerErrorResponse(error, 'delete payment method');
	}
};

import type { RequestHandler } from './$types';
import { customerErrorResponse, requireUser } from '#lib/server/http/customer-response.ts';
import { paymentMethodWriteSchema } from '#lib/server/http/customer-validation.ts';
import { unwrap } from '#shared';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireUser(locals.user);
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

	const parsed = paymentMethodWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{
				error: 'Invalid payment method',
				code: 'VALIDATION_ERROR',
				details: parsed.error.flatten()
			},
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

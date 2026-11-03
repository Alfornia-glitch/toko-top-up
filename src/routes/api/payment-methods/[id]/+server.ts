import type { RequestHandler } from './$types';
import { customerErrorResponse, requireUser } from '#lib/server/modules/customer/http.ts';
import { paymentMethodWriteSchema } from '#lib/server/modules/customer/validation.ts';
import {
	deletePaymentMethod,
	updatePaymentMethod
} from '#lib/server/modules/account/payment-methods.ts';

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
		const updated = await updatePaymentMethod(locals.user!.id, params.id, parsed.data);
		if (!updated) return Response.json({ error: 'Payment method not found' }, { status: 404 });

		return Response.json({ data: updated });
	} catch (error) {
		return customerErrorResponse(error, 'update payment method');
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		const deleted = await deletePaymentMethod(locals.user!.id, params.id);
		if (!deleted) return Response.json({ error: 'Payment method not found' }, { status: 404 });

		return Response.json({ data: { id: params.id, deleted: true } });
	} catch (error) {
		return customerErrorResponse(error, 'delete payment method');
	}
};

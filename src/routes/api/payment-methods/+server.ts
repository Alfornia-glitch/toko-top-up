import type { RequestHandler } from './$types';
import { customerErrorResponse, requireUser } from '#lib/server/http/customer-response.ts';
import { paymentMethodWriteSchema } from '#lib/server/http/customer-validation.ts';
import { unwrap } from '#shared';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		return Response.json({
			data: unwrap(await locals.services.customers.customers.listPaymentMethods(locals.actor))
		});
	} catch (error) {
		return customerErrorResponse(error, 'list payment methods');
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

	const parsed = paymentMethodWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid payment method', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const created = unwrap(
			await locals.services.customers.customers.createPaymentMethod(parsed.data, locals.actor)
		);
		return Response.json({ data: created }, { status: 201 });
	} catch (error) {
		return customerErrorResponse(error, 'create payment method');
	}
};

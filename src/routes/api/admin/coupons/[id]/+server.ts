import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/http/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';
import { couponWriteSchema } from '#lib/server/http/admin-validation.ts';
import { unwrap } from '#shared';
import { apiErrorResponse } from '#lib/server/http/api-error.ts';

export const PATCH: RequestHandler = async (event) => {
	const denied = requireAdmin(event.locals.user);
	if (denied) return denied;
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json(
			{ error: 'Expected a JSON body', code: 'invalid_json_body' },
			{ status: 400 }
		);
	}
	const parsed = couponWriteSchema.safeParse(body);
	if (!parsed.success)
		return Response.json(
			{ error: 'Invalid coupon data', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
			{ status: 422 }
		);
	try {
		const coupon = unwrap(
			await event.locals.services.marketing.marketing.updateCoupon(
				event.params.id,
				parsed.data,
				event.locals.actor
			)
		);
		await auditRequest(event, event.locals.user!.id, {
			action: 'coupon.update',
			entityType: 'coupon',
			entityId: event.params.id,
			after: coupon
		});
		return Response.json({ data: coupon });
	} catch (error) {
		return apiErrorResponse(error, 'update coupon');
	}
};

export const DELETE: RequestHandler = async (event) => {
	const denied = requireAdmin(event.locals.user);
	if (denied) return denied;
	unwrap(
		await event.locals.services.marketing.marketing.deleteCoupon(
			event.params.id,
			event.locals.actor
		)
	);
	await auditRequest(event, event.locals.user!.id, {
		action: 'coupon.delete',
		entityType: 'coupon',
		entityId: event.params.id
	});
	return Response.json({ data: { id: event.params.id } });
};

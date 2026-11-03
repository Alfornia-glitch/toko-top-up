import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { auditRequest } from '#lib/server/modules/admin/audit.ts';
import { couponWriteSchema } from '#lib/server/modules/admin/validation.ts';
import { deleteCoupon, updateCoupon } from '#lib/server/modules/marketing/coupons.ts';
import { catalogErrorResponse } from '#lib/server/modules/catalog/http.ts';

export const PATCH: RequestHandler = async (event) => {
	const denied = requireAdmin(event.locals.user);
	if (denied) return denied;
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}
	const parsed = couponWriteSchema.safeParse(body);
	if (!parsed.success)
		return Response.json(
			{ error: 'Invalid coupon data', details: parsed.error.flatten() },
			{ status: 422 }
		);
	try {
		const coupon = await updateCoupon(event.params.id, parsed.data);
		if (!coupon) return Response.json({ error: 'Coupon not found' }, { status: 404 });
		await auditRequest(event, event.locals.user!.id, {
			action: 'coupon.update',
			entityType: 'coupon',
			entityId: event.params.id,
			after: coupon
		});
		return Response.json({ data: coupon });
	} catch (error) {
		return catalogErrorResponse(error, 'update coupon');
	}
};

export const DELETE: RequestHandler = async (event) => {
	const denied = requireAdmin(event.locals.user);
	if (denied) return denied;
	const result = await deleteCoupon(event.params.id);
	if (result === 'not_found') return Response.json({ error: 'Coupon not found' }, { status: 404 });
	if (result === 'in_use')
		return Response.json({ error: 'Coupon has redemptions; disable it instead' }, { status: 409 });
	await auditRequest(event, event.locals.user!.id, {
		action: 'coupon.delete',
		entityType: 'coupon',
		entityId: event.params.id
	});
	return Response.json({ data: { id: event.params.id } });
};

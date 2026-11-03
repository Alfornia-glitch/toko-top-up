import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { auditRequest } from '#lib/server/modules/admin/audit.ts';
import { couponWriteSchema, paginationSchema } from '#lib/server/modules/admin/validation.ts';
import { createCoupon, listCoupons } from '#lib/server/modules/marketing/coupons.ts';
import { catalogErrorResponse } from '#lib/server/modules/catalog/http.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;
	const parsed = paginationSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
	return Response.json(await listCoupons(parsed.data));
};

export const POST: RequestHandler = async (event) => {
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
		const id = await createCoupon(parsed.data);
		await auditRequest(event, event.locals.user!.id, {
			action: 'coupon.create',
			entityType: 'coupon',
			entityId: id,
			after: parsed.data
		});
		return Response.json({ data: { id } }, { status: 201 });
	} catch (error) {
		return catalogErrorResponse(error, 'create coupon');
	}
};

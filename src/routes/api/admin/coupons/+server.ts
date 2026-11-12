import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';
import { couponWriteSchema, paginationSchema } from '#lib/server/modules/admin/validation.ts';
import { unwrap } from '#shared';
import { apiErrorResponse } from '#lib/server/http/api-error.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;
	const parsed = paginationSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
	return Response.json(
		unwrap(await locals.services.marketing.marketing.listCoupons(parsed.data, locals.actor))
	);
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
		const id = unwrap(
			await event.locals.services.marketing.marketing.createCoupon(parsed.data, event.locals.actor)
		);
		await auditRequest(event, event.locals.user!.id, {
			action: 'coupon.create',
			entityType: 'coupon',
			entityId: id,
			after: parsed.data
		});
		return Response.json({ data: { id } }, { status: 201 });
	} catch (error) {
		return apiErrorResponse(error, 'create coupon');
	}
};

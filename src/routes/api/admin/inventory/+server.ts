import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { inventoryListSchema, stockAdjustSchema } from '#lib/server/modules/admin/validation.ts';
import { adjustStock, listInventory } from '#lib/server/modules/catalog/inventory.ts';
import { catalogErrorResponse } from '#lib/server/modules/catalog/http.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const parsed = inventoryListSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
	}

	return Response.json(await listInventory(parsed.data));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = stockAdjustSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid stock adjustment', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const variant = await adjustStock(parsed.data, locals.user!.id);
		return Response.json({ data: variant }, { status: 201 });
	} catch (error) {
		return catalogErrorResponse(error, 'adjust stock');
	}
};

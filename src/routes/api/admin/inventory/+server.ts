import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { inventoryListSchema, stockAdjustSchema } from '#modules/catalog/index.ts';
import { inventoryService } from './inventory-service.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const parsed = inventoryListSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
	}

	const result = await inventoryService.list(parsed.data);
	if (!result.ok) {
		return Response.json({ error: result.error.message }, { status: result.error.status });
	}

	return Response.json(result.value);
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

	const result = await inventoryService.adjust(parsed.data, locals.user!.id);
	if (!result.ok) {
		return Response.json({ error: result.error.message }, { status: result.error.status });
	}

	return Response.json({ data: result.value }, { status: 201 });
};

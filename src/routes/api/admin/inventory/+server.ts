import type { RequestHandler } from './$types';
import { assertActor } from '#shared';
import { inventoryListSchema, stockAdjustSchema } from '#modules/catalog/index.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const parsed = inventoryListSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
	}

	const result = await locals.services.catalog.inventory.list(
		parsed.data,
		assertActor(locals.actor)
	);
	if (!result.ok) {
		return Response.json({ error: result.error.message }, { status: result.error.status });
	}

	return Response.json(result.value);
};

export const POST: RequestHandler = async ({ locals, request }) => {
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

	const result = await locals.services.catalog.inventory.adjust(
		parsed.data,
		assertActor(locals.actor)
	);
	if (!result.ok) {
		return Response.json({ error: result.error.message }, { status: result.error.status });
	}

	return Response.json({ data: result.value }, { status: 201 });
};

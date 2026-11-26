import type { RequestHandler } from './$types';
import { assertActor, errorBody } from '#shared';
import { inventoryListSchema, stockAdjustSchema } from '#modules/catalog/index.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const parsed = inventoryListSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid query parameters', code: 'invalid_query' },
			{ status: 400 }
		);
	}

	const result = await locals.services.catalog.inventory.list(
		parsed.data,
		assertActor(locals.actor)
	);
	if (!result.ok) {
		return Response.json(errorBody(result.error), { status: result.error.status });
	}

	return Response.json(result.value);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json(
			{ error: 'Expected a JSON body', code: 'invalid_json_body' },
			{ status: 400 }
		);
	}

	const parsed = stockAdjustSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{
				error: 'Invalid stock adjustment',
				code: 'VALIDATION_ERROR',
				details: parsed.error.flatten()
			},
			{ status: 422 }
		);
	}

	const result = await locals.services.catalog.inventory.adjust(
		parsed.data,
		assertActor(locals.actor)
	);
	if (!result.ok) {
		return Response.json(errorBody(result.error), { status: result.error.status });
	}

	return Response.json({ data: result.value }, { status: 201 });
};

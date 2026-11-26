import type { RequestHandler } from './$types';
import { assertActor, errorBody } from '#shared';
import { movementListSchema } from '#modules/catalog/index.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const parsed = movementListSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid query parameters', code: 'invalid_query' },
			{ status: 400 }
		);
	}

	const result = await locals.services.catalog.inventory.listMovements(
		parsed.data,
		assertActor(locals.actor)
	);
	if (!result.ok) {
		return Response.json(errorBody(result.error), { status: result.error.status });
	}

	return Response.json(result.value);
};

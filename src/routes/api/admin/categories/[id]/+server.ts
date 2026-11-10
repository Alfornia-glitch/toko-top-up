import type { RequestHandler } from './$types';
import { assertActor } from '#shared';
import { categoryWriteSchema } from '#modules/catalog/index.ts';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = categoryWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid category data', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	const result = await locals.services.catalog.categories.update(
		params.id,
		parsed.data,
		assertActor(locals.actor)
	);
	if (!result.ok) {
		return Response.json({ error: result.error.message }, { status: result.error.status });
	}

	return Response.json({ data: { id: result.value.id } });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const result = await locals.services.catalog.categories.delete(
		params.id,
		assertActor(locals.actor)
	);
	if (!result.ok) {
		return Response.json({ error: result.error.message }, { status: result.error.status });
	}

	return Response.json({ data: { id: params.id } });
};

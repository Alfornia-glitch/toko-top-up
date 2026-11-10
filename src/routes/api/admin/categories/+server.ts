import type { RequestHandler } from './$types';
import { assertActor } from '#shared';
import { categoryWriteSchema } from '#modules/catalog/index.ts';

export const GET: RequestHandler = async ({ locals }) => {
	const result = await locals.services.catalog.categories.list(assertActor(locals.actor));
	if (!result.ok) {
		return Response.json({ error: result.error.message }, { status: result.error.status });
	}

	return Response.json({ data: result.value });
};

export const POST: RequestHandler = async ({ locals, request }) => {
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

	const result = await locals.services.catalog.categories.create(
		parsed.data,
		assertActor(locals.actor)
	);
	if (!result.ok) {
		return Response.json({ error: result.error.message }, { status: result.error.status });
	}

	return Response.json({ data: { id: result.value.id } }, { status: 201 });
};

import type { RequestHandler } from './$types';
import { assertActor, errorBody } from '#shared';
import { brandWriteSchema } from '#modules/catalog/index.ts';

export const GET: RequestHandler = async ({ locals }) => {
	const result = await locals.services.catalog.brands.list(assertActor(locals.actor));
	if (!result.ok) {
		return Response.json(errorBody(result.error), { status: result.error.status });
	}

	return Response.json({ data: result.value });
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

	const parsed = brandWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid brand data', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	const result = await locals.services.catalog.brands.create(
		parsed.data,
		assertActor(locals.actor)
	);
	if (!result.ok) {
		return Response.json(errorBody(result.error), { status: result.error.status });
	}

	return Response.json({ data: { id: result.value.id } }, { status: 201 });
};

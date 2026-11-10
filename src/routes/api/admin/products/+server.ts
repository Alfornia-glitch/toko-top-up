import type { RequestHandler } from './$types';
import { assertActor } from '#shared';
import { productListSchema, productWriteSchema } from '#modules/catalog/index.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const parsed = productListSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
	}

	const result = await locals.services.catalog.products.list(
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

	const parsed = productWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid product data', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	const result = await locals.services.catalog.products.create(
		parsed.data,
		assertActor(locals.actor)
	);
	if (!result.ok) {
		return Response.json({ error: result.error.message }, { status: result.error.status });
	}

	return Response.json({ data: result.value }, { status: 201 });
};

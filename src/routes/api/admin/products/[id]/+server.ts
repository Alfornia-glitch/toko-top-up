import type { RequestHandler } from './$types';
import { assertActor } from '#shared';
import { productStatusSchema, productWriteSchema } from '#modules/catalog/index.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const result = await locals.services.catalog.products.get(params.id, assertActor(locals.actor));
	if (!result.ok) {
		return Response.json({ error: result.error.message }, { status: result.error.status });
	}

	return Response.json({ data: result.value });
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	if (
		typeof body === 'object' &&
		body !== null &&
		'status' in body &&
		!('name' in body) &&
		!('sku' in body)
	) {
		const parsedStatus = productStatusSchema.safeParse((body as { status?: unknown }).status);
		if (!parsedStatus.success) {
			return Response.json({ error: 'Invalid status' }, { status: 422 });
		}

		const result = await locals.services.catalog.products.setStatus(
			params.id,
			parsedStatus.data,
			assertActor(locals.actor)
		);
		if (!result.ok) {
			return Response.json({ error: result.error.message }, { status: result.error.status });
		}

		return Response.json({ data: result.value });
	}

	const parsed = productWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid product data', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	const result = await locals.services.catalog.products.update(
		params.id,
		parsed.data,
		assertActor(locals.actor)
	);
	if (!result.ok) {
		return Response.json({ error: result.error.message }, { status: result.error.status });
	}

	return Response.json({ data: result.value });
};

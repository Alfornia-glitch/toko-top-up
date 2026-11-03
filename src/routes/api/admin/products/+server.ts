import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { productListSchema, productWriteSchema } from '#lib/server/modules/admin/validation.ts';
import { createProduct, listProducts } from '#lib/server/modules/catalog/products.ts';
import { catalogErrorResponse } from '#lib/server/modules/catalog/http.ts';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const parsed = productListSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
	}

	return Response.json(await listProducts(parsed.data));
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

	const parsed = productWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid product data', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const product = await createProduct(parsed.data, locals.user!.id);
		return Response.json({ data: product }, { status: 201 });
	} catch (error) {
		return catalogErrorResponse(error, 'create product');
	}
};

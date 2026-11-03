import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { productWriteSchema } from '#lib/server/modules/admin/validation.ts';
import {
	getProduct,
	setProductStatus,
	updateProduct
} from '#lib/server/modules/catalog/products.ts';
import { catalogErrorResponse } from '#lib/server/modules/catalog/http.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const product = await getProduct(params.id);
	if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });

	return Response.json({ data: product });
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

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
		const status = (body as { status?: string }).status;
		if (status !== 'draft' && status !== 'active' && status !== 'archived') {
			return Response.json({ error: 'Invalid status' }, { status: 422 });
		}

		const updated = await setProductStatus(params.id, status);
		if (!updated) return Response.json({ error: 'Product not found' }, { status: 404 });

		return Response.json({ data: await getProduct(params.id) });
	}

	const parsed = productWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid product data', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const product = await updateProduct(params.id, parsed.data);
		if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });

		return Response.json({ data: product });
	} catch (error) {
		return catalogErrorResponse(error, 'update product');
	}
};

import type { RequestHandler } from './$types';
import { getPublicProduct } from '#lib/server/modules/storefront/catalog.ts';

export const GET: RequestHandler = async ({ params }) => {
	const product = await getPublicProduct(params.slug);
	if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });
	return Response.json({ data: product });
};

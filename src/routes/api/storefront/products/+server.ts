import type { RequestHandler } from './$types';
import { listPublicProducts } from '#lib/server/modules/storefront/catalog.ts';

export const GET: RequestHandler = async ({ url }) => {
	const page = Number(url.searchParams.get('page') ?? 1);
	const pageSize = Number(url.searchParams.get('pageSize') ?? 24);

	return Response.json(
		await listPublicProducts({
			page: Number.isFinite(page) && page > 0 ? page : 1,
			pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 24,
			q: url.searchParams.get('q') ?? undefined,
			categoryId: url.searchParams.get('categoryId') ?? undefined,
			brandId: url.searchParams.get('brandId') ?? undefined,
			featured: url.searchParams.get('featured') === 'true',
			deal: url.searchParams.get('deal') === 'true',
			newArrival: url.searchParams.get('newArrival') === 'true'
		})
	);
};

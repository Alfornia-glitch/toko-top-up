import type { RequestHandler } from './$types';
import { unwrap } from '#shared';

const SORTS = ['recommended', 'popular', 'price_asc', 'price_desc', 'newest'] as const;

function numberParam(value: string | null): number | undefined {
	if (value === null || value === '') return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function sortParam(value: string | null) {
	return SORTS.includes(value as (typeof SORTS)[number])
		? (value as (typeof SORTS)[number])
		: undefined;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const page = Number(url.searchParams.get('page') ?? 1);
	const pageSize = Number(url.searchParams.get('pageSize') ?? 24);

	return Response.json(
		unwrap(
			await locals.services.storefront.storefront.listProducts({
				page: Number.isFinite(page) && page > 0 ? page : 1,
				pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 24,
				q: url.searchParams.get('q') ?? undefined,
				categoryId: url.searchParams.get('categoryId') ?? undefined,
				brandId: url.searchParams.get('brandId') ?? undefined,
				featured: url.searchParams.get('featured') === 'true',
				deal: url.searchParams.get('deal') === 'true',
				newArrival: url.searchParams.get('newArrival') === 'true',
				sort: sortParam(url.searchParams.get('sort')),
				minPrice: numberParam(url.searchParams.get('minPrice')),
				maxPrice: numberParam(url.searchParams.get('maxPrice')),
				minRating: numberParam(url.searchParams.get('minRating')),
				color: url.searchParams.get('color') ?? undefined,
				inStock: url.searchParams.get('inStock') === 'true'
			})
		)
	);
};

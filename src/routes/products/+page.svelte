<script lang="ts">
	import { page } from '$app/state';
	import ProductGridBanner from '#lib/frontend/pages/ProductGridBanner.svelte';
	import ProductGridSidebar from '#lib/frontend/pages/ProductGridSidebar.svelte';
	import ProductListBanner from '#lib/frontend/pages/ProductListBanner.svelte';
	import ProductListSidebar from '#lib/frontend/pages/ProductListSidebar.svelte';
	import type { ProductQuery } from '#lib/frontend/modules/commerce/products.ts';

	const search = $derived(page.url.searchParams);
	const isList = $derived(search.get('view') === 'list');
	const hasSidebar = $derived(search.get('sidebar') === '1');

	const sort = $derived<ProductQuery['sort']>(
		search.get('sort') === 'popular'
			? 'popular'
			: search.get('sort') === 'price_asc'
				? 'price_asc'
				: search.get('sort') === 'price_desc'
					? 'price_desc'
					: search.get('sort') === 'newest'
						? 'newest'
						: search.get('sort') === 'recommended'
							? 'recommended'
							: undefined
	);

	const query = $derived<ProductQuery>({
		q: search.get('q') ?? undefined,
		categoryId: search.get('categoryId') ?? undefined,
		brandId: search.get('brandId') ?? undefined,
		minPrice: positiveNumber(search.get('minPrice')),
		maxPrice: positiveNumber(search.get('maxPrice')),
		color: search.get('color') ?? undefined,
		featured: search.get('featured') === 'true' ? true : undefined,
		deal: search.get('deal') === 'true' ? true : undefined,
		newArrival: search.get('newArrival') === 'true' ? true : undefined,
		sort,
		page: positiveNumber(search.get('page'))
	});

	function positiveNumber(value: string | null): number | undefined {
		if (!value) return undefined;
		const parsed = Number(value);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
	}
</script>

{#if isList && hasSidebar}
	<ProductListSidebar {query} />
{:else if isList}
	<ProductListBanner {query} />
{:else if hasSidebar}
	<ProductGridSidebar {query} />
{:else}
	<ProductGridBanner {query} />
{/if}

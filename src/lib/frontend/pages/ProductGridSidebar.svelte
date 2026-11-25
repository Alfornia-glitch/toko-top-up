<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page as appPage } from '$app/state';
	import Pagination from '#lib/frontend/components/ui/Pagination.svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import StorefrontProductCard from '#lib/frontend/components/storefront/StorefrontProductCard.svelte';
	import { listProducts } from '#lib/frontend/modules/commerce/products.ts';
	import type { ProductQuery } from '#lib/frontend/modules/commerce/products.ts';
	import type { ProductListResult } from '#lib/frontend/modules/commerce/models.ts';
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	let {
		query = {},
		basePath = '/products',
		lockedCategoryId = undefined,
		before = undefined
	}: {
		query?: ProductQuery;
		basePath?: string;
		lockedCategoryId?: string;
		before?: Snippet;
	} = $props();

	type SortValue = NonNullable<ProductQuery['sort']>;

	interface Filters {
		categoryId?: string;
		brandId?: string;
		minPrice?: number;
		maxPrice?: number;
		color?: string;
		sort?: SortValue;
	}

	let result = $state<ProductListResult | null>(null);
	let loading = $state(true);
	let error = $state('');
	let filters = $state<Filters>(
		untrack(() => ({
			categoryId: lockedCategoryId ?? query.categoryId,
			brandId: query.brandId,
			minPrice: query.minPrice,
			maxPrice: query.maxPrice,
			color: query.color,
			sort: query.sort
		}))
	);
	let page = $state(untrack(() => query.page ?? 1));
	let minInput = $state(
		untrack(() => (query.minPrice != null ? String(query.minPrice / 100) : ''))
	);
	let maxInput = $state(
		untrack(() => (query.maxPrice != null ? String(query.maxPrice / 100) : ''))
	);

	let requestId = 0;

	onMount(() => {
		void home.ensure();
	});

	const selectedCategory = $derived(
		result?.facets.categories.find((category) => category.id === filters.categoryId)?.name ??
			home.categories.find((category) => category.id === filters.categoryId)?.name ??
			'Products'
	);
	const selectedBrand = $derived(
		result?.facets.brands.find((brand) => brand.id === filters.brandId)?.name ??
			home.brands.find((brand) => brand.id === filters.brandId)?.name ??
			''
	);
	const totalPages = $derived(
		result ? Math.max(1, Math.ceil(result.total / Math.max(1, result.pageSize))) : 1
	);
	const pageNumbers = $derived(buildPageNumbers(page, totalPages));
	const priceRanges = $derived.by(() => {
		const bounds = result?.facets.price;
		if (!bounds || bounds.maxCents <= bounds.minCents) return [];
		const step = (bounds.maxCents - bounds.minCents) / 4;
		return Array.from({ length: 4 }, (_, index) => ({
			min: Math.round(bounds.minCents + step * index),
			max: index === 3 ? bounds.maxCents : Math.round(bounds.minCents + step * (index + 1))
		}));
	});

	function buildPageNumbers(current: number, total: number): number[] {
		if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
		const start = Math.min(Math.max(current - 3, 1), total - 6);
		return Array.from({ length: 7 }, (_, index) => start + index);
	}

	function currentSearch(overrides: Record<string, string | number | null | undefined> = {}) {
		const params = new URLSearchParams(appPage.url.search);
		const values: Record<string, string | number | null | undefined> = {
			categoryId: filters.categoryId,
			brandId: filters.brandId,
			minPrice: filters.minPrice,
			maxPrice: filters.maxPrice,
			color: filters.color,
			sort: filters.sort && filters.sort !== 'recommended' ? filters.sort : null,
			page: page > 1 ? page : null,
			...overrides
		};

		for (const [key, value] of Object.entries(values)) {
			if (value === null || value === undefined || value === '') params.delete(key);
			else params.set(key, String(value));
		}

		return params.toString();
	}

	function syncUrl(overrides: Record<string, string | number | null | undefined> = {}) {
		const search = currentSearch(overrides);
		void goto(`${basePath}${search ? `?${search}` : ''}`, { replace: true, reset: false });
	}

	function viewHref(list: boolean) {
		const search = currentSearch({ view: list ? 'list' : null });
		return `${basePath}${search ? `?${search}` : ''}`;
	}

	function selectCategory(id: string) {
		filters.categoryId = filters.categoryId === id ? undefined : id;
		page = 1;
		syncUrl({ categoryId: filters.categoryId ?? null, page: null });
	}

	function selectBrand(id: string) {
		filters.brandId = filters.brandId === id ? undefined : id;
		page = 1;
		syncUrl({ brandId: filters.brandId ?? null, page: null });
	}

	function selectColor(color: string) {
		filters.color = filters.color === color ? undefined : color;
		page = 1;
		syncUrl({ color: filters.color ?? null, page: null });
	}

	function changeSort(next: SortValue) {
		filters.sort = next;
		page = 1;
		syncUrl({ sort: next === 'recommended' ? null : next, page: null });
	}

	function applyPrice() {
		const min = minInput.trim() === '' ? undefined : Math.round(Number(minInput) * 100);
		const max = maxInput.trim() === '' ? undefined : Math.round(Number(maxInput) * 100);
		filters.minPrice = min != null && Number.isFinite(min) ? min : undefined;
		filters.maxPrice = max != null && Number.isFinite(max) ? max : undefined;
		page = 1;
		syncUrl({ minPrice: filters.minPrice ?? null, maxPrice: filters.maxPrice ?? null, page: null });
	}

	function applyRange(min: number, max: number) {
		minInput = String(min / 100);
		maxInput = String(max / 100);
		filters.minPrice = min;
		filters.maxPrice = max;
		page = 1;
		syncUrl({ minPrice: min, maxPrice: max, page: null });
	}

	function clearAll() {
		filters.categoryId = lockedCategoryId;
		filters.brandId = undefined;
		filters.minPrice = undefined;
		filters.maxPrice = undefined;
		filters.color = undefined;
		minInput = '';
		maxInput = '';
		page = 1;
		syncUrl({
			categoryId: null,
			brandId: null,
			minPrice: null,
			maxPrice: null,
			color: null,
			page: null
		});
	}

	function selectPage(next: number) {
		if (next < 1 || next > totalPages || next === page) return;
		page = next;
		syncUrl({ page: next > 1 ? next : null });
	}

	async function loadProducts() {
		const request = ++requestId;
		loading = true;
		error = '';

		try {
			const response = await listProducts({
				...query,
				page,
				...filters,
				categoryId: lockedCategoryId ?? filters.categoryId
			});
			if (request !== requestId) return;
			result = response;
		} catch (cause) {
			if (request !== requestId) return;
			result = null;
			error = cause instanceof Error ? cause.message : 'Could not load products';
		} finally {
			if (request === requestId) loading = false;
		}
	}

	$effect(() => {
		void loadProducts();
	});

	const imgBreadcrumb = '/assets/20e59.svg';
	const imgMenuIcon = '/assets/a05bd.svg';
	const imgGridIcon = '/assets/1b829.svg';
	const imgListIcon = '/assets/0d4d6.svg';
	const imgSelectIcon = '/assets/2ea59.svg';
	const imgX = '/assets/21a32.svg';
	const imgCheck = '/assets/82e9f.svg';
	const imgLeftIcon = '/assets/ca51b.svg';
	const imgLeftIcon1 = '/assets/6b5ef.svg';
	const imgSeparator = '/assets/402db.svg';
</script>

<div
	class="relative flex size-full flex-col content-stretch items-center bg-white"
	data-name="Shopix - Product Listing Grid View With Sidebar"
>
	<SiteHeader />
	{@render before?.()}
	<div
		class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center gap-[14px] bg-white px-4 py-[56px] sm:px-8"
		data-name="Category filter"
	>
		<div class="relative flex w-full shrink-0 content-stretch items-center" data-name="Breadcrumbs">
			<div
				class="relative flex max-h-[28px] shrink-0 content-stretch items-center gap-[6px]"
				data-name="Items"
			>
				<a
					href="/"
					class="relative flex shrink-0 content-stretch items-center justify-center"
					data-name="Breadcrumb item"
				>
					<p
						class="relative shrink-0 font-['Geist:Regular'] text-[14px] leading-[20px] font-normal [word-break:break-word] whitespace-nowrap text-[#737373]"
					>
						Home
					</p>
				</a>
				<div class="relative size-[14px] shrink-0" data-name="Breadcrumb icon placeholder">
					<img
						loading="lazy"
						decoding="async"
						alt=""
						class="absolute inset-0 block size-full max-w-none"
						src={imgBreadcrumb}
					/>
				</div>
				<div
					class="relative flex shrink-0 content-stretch items-center justify-center"
					data-name="Breadcrumb item"
				>
					<p
						class={`relative shrink-0 font-['Geist:Regular'] text-[14px] leading-[20px] font-normal [word-break:break-word] whitespace-nowrap ${
							selectedBrand ? 'text-[#737373]' : 'text-[#0a0a0a]'
						}`}
					>
						{selectedCategory}
					</p>
				</div>
				{#if selectedBrand}
					<div class="relative size-[14px] shrink-0" data-name="Breadcrumb icon placeholder">
						<img
							loading="lazy"
							decoding="async"
							alt=""
							class="absolute inset-0 block size-full max-w-none"
							src={imgBreadcrumb}
						/>
					</div>
					<div
						class="relative flex h-[20px] shrink-0 content-stretch items-center justify-center"
						data-name="Breadcrumb item"
					>
						<p
							class="relative shrink-0 font-['Geist:Regular'] text-[14px] leading-[20px] font-normal [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
						>
							{selectedBrand}
						</p>
					</div>
				{/if}
			</div>
		</div>
		<div
			class="relative flex w-full min-w-[328px] shrink-0 content-stretch items-start gap-[16px]"
			data-name="Flex Horizontal"
		>
			<div
				class="relative flex max-w-[323px] min-w-[299px] flex-[1_0_0] flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
				data-name="Card"
			>
				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start px-[16px]"
					data-name="card-header"
				>
					<div
						class="relative flex w-full shrink-0 content-stretch items-center justify-center gap-[10px] [word-break:break-word]"
						data-name="Flex Horizontal"
					>
						<p
							class="relative min-w-px flex-[1_0_0] font-['Geist:SemiBold'] text-[24px] leading-[32px] font-semibold text-[#0a0a0a]"
						>
							Filter
						</p>
						<button
							type="button"
							class="relative min-w-px flex-[1_0_0] cursor-pointer text-right font-['Geist:Regular'] text-[16px] leading-[24px] font-normal text-[#dc2626]"
							onclick={clearAll}
						>
							Clear All
						</button>
					</div>
				</div>
				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[24px] px-[16px]"
					data-name="card-body"
				>
					<div class="relative h-0 w-full shrink-0" data-name="Separator">
						<div class="absolute inset-[-1px_0_0_0]">
							<img
								loading="lazy"
								decoding="async"
								alt=""
								class="block size-full max-w-none"
								src={imgSeparator}
							/>
						</div>
					</div>
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px]"
						data-name="Flex Vertical"
					>
						<div
							class="relative flex w-full shrink-0 content-stretch items-center justify-between"
							data-name="Flex Horizontal"
						>
							<p
								class="relative shrink-0 font-['Geist:Medium'] text-[20px] leading-[28px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
							>
								Brand
							</p>
						</div>
						{#each result?.facets.brands ?? [] as brand (brand.id)}
							<button
								type="button"
								class="relative flex h-[20px] w-full shrink-0 cursor-pointer content-stretch items-start gap-[8px]"
								data-name="Check box"
								onclick={() => selectBrand(brand.id)}
							>
								<div
									class={`relative flex size-[20px] shrink-0 content-stretch items-center justify-center rounded-[4px] border border-solid ${
										filters.brandId === brand.id
											? 'border-[#171717] bg-[#171717]'
											: 'border-[#e5e5e5] bg-white'
									}`}
									data-name="Checkbox"
								>
									{#if filters.brandId === brand.id}
										<div class="relative size-[16px] shrink-0" data-name="check">
											<img
												loading="lazy"
												decoding="async"
												alt=""
												class="absolute inset-0 block size-full max-w-none"
												src={imgCheck}
											/>
										</div>
									{/if}
								</div>
								<div
									class="relative flex h-full shrink-0 flex-col content-stretch items-start justify-center gap-[8px]"
									data-name="Text"
								>
									<p
										class="font-['Geist:Regular'] text-[14px] leading-[20px] font-normal text-[#0a0a0a]"
									>
										{brand.name}
									</p>
								</div>
							</button>
						{/each}
					</div>
					<div class="relative h-0 w-full shrink-0" data-name="Separator">
						<div class="absolute inset-[-1px_0_0_0]">
							<img
								loading="lazy"
								decoding="async"
								alt=""
								class="block size-full max-w-none"
								src={imgSeparator}
							/>
						</div>
					</div>
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px]"
						data-name="Advance slider"
					>
						<p
							class="relative w-[min-content] min-w-full shrink-0 font-['Geist:Medium'] text-[20px] leading-[28px] font-medium [word-break:break-word] text-[#0a0a0a]"
						>
							Price
						</p>
						<div
							class="relative flex w-full shrink-0 content-stretch items-center gap-[8px]"
							data-name="slider content"
						>
							<input
								type="number"
								min="0"
								placeholder="Min"
								value={minInput}
								onchange={applyPrice}
								class="min-w-0 flex-1 rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[6px] font-['Geist:Regular'] text-[14px] text-[#0a0a0a] outline-none"
							/>
							<input
								type="number"
								min="0"
								placeholder="Max"
								value={maxInput}
								onchange={applyPrice}
								class="min-w-0 flex-1 rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[6px] font-['Geist:Regular'] text-[14px] text-[#0a0a0a] outline-none"
							/>
						</div>
						{#each priceRanges as range, index (index)}
							<button
								type="button"
								class="w-full cursor-pointer text-left font-['Geist:Regular'] text-[14px] leading-[20px] font-normal text-[#737373] hover:text-[#0a0a0a]"
								onclick={() => applyRange(range.min, range.max)}
							>
								{formatMoney(range.min)} – {formatMoney(range.max)}
							</button>
						{/each}
					</div>
					<div class="relative h-0 w-full shrink-0" data-name="Separator">
						<div class="absolute inset-[-1px_0_0_0]">
							<img
								loading="lazy"
								decoding="async"
								alt=""
								class="block size-full max-w-none"
								src={imgSeparator}
							/>
						</div>
					</div>
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px]"
						data-name="Flex Vertical"
					>
						<div
							class="relative flex w-full shrink-0 content-stretch items-center justify-between"
							data-name="Flex Horizontal"
						>
							<p
								class="relative shrink-0 font-['Geist:Medium'] text-[20px] leading-[28px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
							>
								Color
							</p>
						</div>
						<div
							class="relative flex shrink-0 flex-wrap content-start items-center gap-[6.913px]"
							data-name="Flex Horizontal"
						>
							{#each result?.facets.colors ?? [] as color (color)}
								<button
									type="button"
									class={`relative flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid text-[10px] ${
										filters.color === color
											? 'border-[#171717] bg-[#171717] text-white'
											: 'border-[#e5e5e5] bg-white text-[#0a0a0a]'
									}`}
									data-name="Color"
									title={color}
									onclick={() => selectColor(color)}
								>
									{color.slice(0, 1)}
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>
			<div
				class="relative flex min-w-0 flex-1 flex-col content-stretch items-center justify-center gap-[32px]"
				data-name="Flex Vertical"
			>
				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start justify-center gap-[8px]"
					data-name="Flex Vertical"
				>
					<div
						class="relative flex w-full shrink-0 content-stretch items-center"
						data-name="Flex Horizontal"
					>
						{#if !lockedCategoryId}
							<div
								class="relative flex w-[468px] shrink-0 content-stretch items-center gap-[12px]"
								data-name="Flex Horizontal"
							>
								{#each result?.facets.categories ?? [] as category (category.id)}
									<button
										type="button"
										class="relative flex shrink-0 cursor-pointer content-stretch items-center justify-center gap-[10px]"
										data-name="Menu Item"
										onclick={() => selectCategory(category.id)}
									>
										<p
											class={`relative shrink-0 font-['Geist:Medium'] text-[16px] leading-[24px] font-medium [word-break:break-word] whitespace-nowrap ${
												filters.categoryId === category.id
													? 'text-[#171717]'
													: 'text-[#0a0a0a] opacity-60'
											}`}
										>
											{category.name}
										</p>
										<div class="relative size-[16px] shrink-0" data-name="Left-icon">
											<img
												loading="lazy"
												decoding="async"
												alt=""
												class="absolute inset-0 block size-full max-w-none"
												src={imgMenuIcon}
											/>
										</div>
									</button>
								{/each}
							</div>
						{/if}
						<div
							class="relative flex min-w-px flex-[1_0_0] content-stretch items-center justify-end gap-[16px]"
							data-name="Flex Horizontal"
						>
							<div
								class="relative flex shrink-0 flex-col content-stretch items-end justify-center"
								data-name="Flex Horizontal"
							>
								<div
									class="relative isolate flex shrink-0 flex-wrap content-center items-center overflow-clip rounded-[10px] bg-[#f5f5f5] p-[3px]"
									data-name="Advance Tabs"
								>
									<div
										class="relative z-[1] flex w-[358px] shrink-0 content-stretch items-center"
										data-name="Items"
									>
										<a
											href={viewHref(false)}
											class="relative flex shrink-0 content-stretch items-center justify-center gap-[4px] overflow-clip rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[8px] py-[4px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
											data-name="Tab 01"
										>
											<div class="relative size-[16px] shrink-0" data-name="left-icon">
												<img
													loading="lazy"
													decoding="async"
													alt=""
													class="absolute inset-0 block size-full max-w-none"
													src={imgGridIcon}
												/>
											</div>
											<p
												class="relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
											>
												Grid
											</p>
										</a>
										<a
											href={viewHref(true)}
											class="relative flex shrink-0 content-stretch items-center justify-center gap-[4px] rounded-[10px] px-[8px] py-[4px]"
											data-name="Tab 02"
										>
											<div class="relative size-[16px] shrink-0" data-name="left-icon">
												<img
													loading="lazy"
													decoding="async"
													alt=""
													class="absolute inset-0 block size-full max-w-none"
													src={imgListIcon}
												/>
											</div>
											<p
												class="relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a] opacity-60"
											>
												List
											</p>
										</a>
									</div>
								</div>
							</div>
							<div class="flex flex-row items-center self-stretch">
								<div
									class="relative flex h-full w-[160px] shrink-0 flex-col content-stretch items-start gap-[8px]"
									data-name="Default Select"
								>
									<div
										class="relative flex min-h-px w-full flex-[1_0_0] content-stretch items-center gap-[6px] rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[6px]"
										data-name="SelectValue"
									>
										<select
											class="w-full cursor-pointer appearance-none bg-transparent font-['Geist:Regular'] text-[12px] leading-[16px] font-normal text-[#737373] outline-none"
											value={filters.sort ?? 'recommended'}
											onchange={(event) => changeSort(event.currentTarget.value as SortValue)}
										>
											<option value="recommended">Sort : Recommended</option>
											<option value="popular">Sort : Popular</option>
											<option value="price_asc">Sort : Price: Low to High</option>
											<option value="price_desc">Sort : Price: High to Low</option>
											<option value="newest">Sort : Newest</option>
										</select>
										<div class="relative size-[16px] shrink-0" data-name="chevron-down">
											<img
												loading="lazy"
												decoding="async"
												alt=""
												class="absolute inset-0 block size-full max-w-none"
												src={imgSelectIcon}
											/>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div
						class="relative flex shrink-0 flex-wrap content-stretch items-start gap-[12px]"
						data-name="Flex Horizontal"
					>
						{#if !lockedCategoryId && filters.categoryId}
							<button
								type="button"
								class="relative flex h-[26px] shrink-0 cursor-pointer content-stretch items-center justify-center gap-[4px] rounded-[9999px] px-[12px] py-[4px]"
								style="background-image: linear-gradient(90deg, rgba(23, 23, 23, 0.1) 0%, rgba(23, 23, 23, 0.1) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)"
								data-name="Soft Badge"
								onclick={() => selectCategory(filters.categoryId ?? '')}
							>
								<p
									class="font-['Geist:Medium'] text-[12px] leading-[16px] font-medium text-[#171717]"
								>
									{selectedCategory}
								</p>
								<div class="relative size-[12px] shrink-0" data-name="x">
									<img
										loading="lazy"
										decoding="async"
										alt=""
										class="absolute inset-0 block size-full max-w-none"
										src={imgX}
									/>
								</div>
							</button>
						{/if}
						{#if filters.brandId && selectedBrand}
							<button
								type="button"
								class="relative flex h-[26px] shrink-0 cursor-pointer content-stretch items-center justify-center gap-[4px] rounded-[9999px] px-[12px] py-[4px]"
								style="background-image: linear-gradient(90deg, rgba(23, 23, 23, 0.1) 0%, rgba(23, 23, 23, 0.1) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)"
								data-name="Soft Badge"
								onclick={() => selectBrand(filters.brandId ?? '')}
							>
								<p
									class="font-['Geist:Medium'] text-[12px] leading-[16px] font-medium text-[#171717]"
								>
									{selectedBrand}
								</p>
								<div class="relative size-[12px] shrink-0" data-name="x">
									<img
										loading="lazy"
										decoding="async"
										alt=""
										class="absolute inset-0 block size-full max-w-none"
										src={imgX}
									/>
								</div>
							</button>
						{/if}
						{#if filters.minPrice != null || filters.maxPrice != null}
							<button
								type="button"
								class="relative flex h-[26px] shrink-0 cursor-pointer content-stretch items-center justify-center gap-[4px] rounded-[9999px] px-[12px] py-[4px]"
								style="background-image: linear-gradient(90deg, rgba(23, 23, 23, 0.1) 0%, rgba(23, 23, 23, 0.1) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)"
								data-name="Soft Badge"
								onclick={() => {
									minInput = '';
									maxInput = '';
									filters.minPrice = undefined;
									filters.maxPrice = undefined;
									page = 1;
									syncUrl({ minPrice: null, maxPrice: null, page: null });
								}}
							>
								<p
									class="font-['Geist:Medium'] text-[12px] leading-[16px] font-medium text-[#171717]"
								>
									{filters.minPrice != null && filters.maxPrice != null
										? `${formatMoney(filters.minPrice)} – ${formatMoney(filters.maxPrice)}`
										: filters.minPrice != null
											? `From ${formatMoney(filters.minPrice)}`
											: `Up to ${formatMoney(filters.maxPrice ?? 0)}`}
								</p>
								<div class="relative size-[12px] shrink-0" data-name="x">
									<img
										loading="lazy"
										decoding="async"
										alt=""
										class="absolute inset-0 block size-full max-w-none"
										src={imgX}
									/>
								</div>
							</button>
						{/if}
						{#if filters.color}
							<button
								type="button"
								class="relative flex h-[26px] shrink-0 cursor-pointer content-stretch items-center justify-center gap-[4px] rounded-[9999px] px-[12px] py-[4px]"
								style="background-image: linear-gradient(90deg, rgba(23, 23, 23, 0.1) 0%, rgba(23, 23, 23, 0.1) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)"
								data-name="Soft Badge"
								onclick={() => selectColor(filters.color ?? '')}
							>
								<p
									class="font-['Geist:Medium'] text-[12px] leading-[16px] font-medium text-[#171717]"
								>
									{filters.color}
								</p>
								<div class="relative size-[12px] shrink-0" data-name="x">
									<img
										loading="lazy"
										decoding="async"
										alt=""
										class="absolute inset-0 block size-full max-w-none"
										src={imgX}
									/>
								</div>
							</button>
						{/if}
					</div>
				</div>
				<div class="flex w-full items-center justify-between" data-name="Flex Horizontal">
					<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
						{loading ? 'Loading products…' : `${result?.total ?? 0} products`}
					</p>
				</div>
				{#if loading}
					<div
						class="grid w-full shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
						data-name="Flex Horizontal"
					>
						{#each [0, 1, 2, 3, 4, 5, 6, 7] as skeleton (skeleton)}
							<div
								class="relative flex flex-col content-stretch items-start"
								data-name="Product Card"
							>
								<div
									class="h-[448px] w-full shrink-0 animate-pulse rounded-[14px] bg-[#f5f5f5]"
									data-name="Card"
								></div>
							</div>
						{/each}
					</div>
				{:else if error}
					<p class="w-full font-['Geist:Regular'] text-[16px] leading-[24px] text-[#dc2626]">
						{error}
					</p>
				{:else if result && result.data.length === 0}
					<p class="w-full font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
						No products found for the selected filters.
					</p>
				{:else if result}
					<div
						class="grid w-full shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
						data-name="Flex Horizontal"
					>
						{#each result.data as product (product.id)}
							<div
								class="relative flex flex-col content-stretch items-start"
								data-name="Product Card"
							>
								<StorefrontProductCard {product} />
							</div>
						{/each}
					</div>
					<Pagination class="relative flex shrink-0 content-stretch items-start">
						<button
							type="button"
							disabled={page <= 1}
							onclick={() => selectPage(page - 1)}
							class="relative flex h-[32px] shrink-0 cursor-pointer content-stretch items-center justify-center gap-[6px] rounded-[10px] pr-[10px] pl-[6px] disabled:cursor-default disabled:opacity-40"
							data-name="Ghost Button"
						>
							<div class="relative size-[16px] shrink-0" data-name="Left icon">
								<img
									loading="lazy"
									decoding="async"
									alt=""
									class="absolute inset-0 block size-full max-w-none"
									src={imgLeftIcon}
								/>
							</div>
							<p
								class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
							>
								Previous
							</p>
						</button>
						{#each pageNumbers as number (number)}
							<button
								type="button"
								onclick={() => selectPage(number)}
								class={`relative flex size-[32px] shrink-0 cursor-pointer content-stretch items-center justify-center rounded-[10px] ${
									number === page ? 'border border-solid border-[#e5e5e5] bg-white' : ''
								}`}
								data-name={number === page ? 'Outline Button' : 'Ghost Button'}
							>
								<p
									class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
								>
									{number}
								</p>
							</button>
						{/each}
						<button
							type="button"
							disabled={page >= totalPages}
							onclick={() => selectPage(page + 1)}
							class="relative flex h-[32px] shrink-0 cursor-pointer content-stretch items-center justify-center gap-[6px] rounded-[10px] pr-[6px] pl-[10px] disabled:cursor-default disabled:opacity-40"
							data-name="Ghost Button"
						>
							<p
								class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
							>
								Next
							</p>
							<div class="relative size-[16px] shrink-0" data-name="Left icon">
								<img
									loading="lazy"
									decoding="async"
									alt=""
									class="absolute inset-0 block size-full max-w-none"
									src={imgLeftIcon1}
								/>
							</div>
						</button>
					</Pagination>
				{/if}
			</div>
		</div>
	</div>
	<SiteFooter />
</div>

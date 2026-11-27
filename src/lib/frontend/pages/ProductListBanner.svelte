<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { onMount, untrack } from 'svelte';
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
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	let { query = {} }: { query?: ProductQuery } = $props();

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
			categoryId: query.categoryId,
			brandId: query.brandId,
			minPrice: query.minPrice,
			maxPrice: query.maxPrice,
			color: query.color,
			sort: query.sort
		}))
	);
	let page = $state(untrack(() => query.page ?? 1));

	let requestId = 0;

	onMount(() => {
		void home.ensure();
	});

	const banner = $derived(home.banner('promo'));
	const brandName = $derived(
		result?.facets.brands.find((brand) => brand.id === filters.brandId)?.name ?? ''
	);
	const selectedCategory = $derived(
		result?.facets.categories.find((category) => category.id === filters.categoryId)?.name ?? ''
	);
	const priceLabel = $derived(
		filters.minPrice != null || filters.maxPrice != null
			? filters.minPrice != null && filters.maxPrice != null
				? `${formatMoney(filters.minPrice)} – ${formatMoney(filters.maxPrice)}`
				: filters.minPrice != null
					? m.storefront_listing_price_from({ price: formatMoney(filters.minPrice) })
					: m.storefront_listing_price_up_to({ price: formatMoney(filters.maxPrice ?? 0) })
			: ''
	);
	const totalPages = $derived(
		result ? Math.max(1, Math.ceil(result.total / Math.max(1, result.pageSize))) : 1
	);
	const pageNumbers = $derived(buildPageNumbers(page, totalPages));

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
		void goto(`/products${search ? `?${search}` : ''}`, { replace: true, reset: false });
	}

	function viewHref(list: boolean) {
		const search = currentSearch({ view: list ? 'list' : null });
		return `/products${search ? `?${search}` : ''}`;
	}

	function selectCategory(id: string) {
		filters.categoryId = filters.categoryId === id ? undefined : id;
		page = 1;
		syncUrl({ categoryId: filters.categoryId ?? null, page: null });
	}

	function changeSort(next: SortValue) {
		filters.sort = next;
		page = 1;
		syncUrl({ sort: next === 'recommended' ? null : next, page: null });
	}

	function clearPrice() {
		filters.minPrice = undefined;
		filters.maxPrice = undefined;
		page = 1;
		syncUrl({ minPrice: null, maxPrice: null, page: null });
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
			const response = await listProducts({ ...query, page, ...filters });
			if (request !== requestId) return;
			result = response;
		} catch (cause) {
			if (request !== requestId) return;
			result = null;
			error = errorMessage(cause, 'storefront_listing_load_failed');
		} finally {
			if (request === requestId) loading = false;
		}
	}

	$effect(() => {
		void loadProducts();
	});

	const imgMenuIcon = '/assets/a05bd.svg';
	const imgGridIcon = '/assets/1b829.svg';
	const imgListIcon = '/assets/0d4d6.svg';
	const imgSelectIcon = '/assets/2ea59.svg';
	const imgRightIcon = '/assets/96cdd.svg';
	const imgX = '/assets/21a32.svg';
	const imgLeftIcon = '/assets/ca51b.svg';
	const imgLeftIcon1 = '/assets/6b5ef.svg';
</script>

<div
	class="relative flex size-full flex-col content-stretch items-center bg-card"
	data-name="Shopix - Product Listing List View With Banner"
>
	<SiteHeader />
	{#if banner}
		<div
			class="relative flex w-full shrink-0 content-stretch items-center justify-center overflow-clip py-[56px] max-[480px]:py-9"
			data-name="Hero"
		>
			<div
				class="relative flex max-w-[1280px] min-w-px flex-[1_0_0] content-stretch items-start px-[32px] max-[480px]:px-3.5"
				data-name="Flex Horizontal"
			>
				<div
					class="relative flex h-[370px] min-w-px flex-[1_0_0] content-stretch items-start justify-between overflow-clip rounded-[8px] bg-primary pt-[40px] pl-[40px]"
					data-name="Flex Horizontal"
				>
					<div
						class="relative flex min-w-[328px] shrink-0 flex-col content-stretch items-start justify-center gap-[16px]"
						data-name="block-heading"
					>
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[8px] [word-break:break-word] text-black"
						>
							<p
								class="relative w-[628px] shrink-0 font-['Geist:Bold'] text-[48px] leading-[normal] font-bold"
							>
								{banner.title}
							</p>
							{#if banner.subtitle}
								<p
									class="relative w-[min-content] min-w-full shrink-0 font-['Geist:Regular'] text-[18px] leading-[28px] font-normal"
								>
									{banner.subtitle}
								</p>
							{/if}
						</div>
						{#if banner.ctaLabel && banner.ctaUrl}
							<a
								href={banner.ctaUrl}
								class="relative flex shrink-0 content-stretch items-center justify-center gap-[6px] overflow-clip rounded-[10px] border border-solid border-muted bg-muted px-[16px] py-[8px]"
								data-name="Solid button"
							>
								<div
									class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-primary"
								>
									<p class="leading-[20px]">{banner.ctaLabel}</p>
								</div>
								<div class="relative size-[16px] shrink-0" data-name="Right-icon">
									<img
										loading="lazy"
										decoding="async"
										alt=""
										class="absolute inset-0 block size-full max-w-none"
										src={imgRightIcon}
									/>
								</div>
							</a>
						{/if}
					</div>
					<div class="absolute top-[85px] left-[712px] h-[285px] w-[443px]" data-name="image 121">
						<img
							loading="lazy"
							decoding="async"
							src={banner.imageUrl}
							alt={banner.title}
							class="pointer-events-none absolute inset-0 size-full max-w-none object-bottom"
						/>
					</div>
				</div>
			</div>
		</div>
	{/if}
	<div
		class="relative flex w-full max-w-[1440px] shrink-0 content-stretch items-center justify-center bg-card py-[56px] max-[480px]:py-9"
		data-name="Category filter"
	>
		<div
			class="relative flex max-w-[1280px] min-w-[328px] flex-[1_0_0] content-stretch items-start overflow-clip px-[32px] max-[480px]:px-3.5"
			data-name="Flex Horizontal"
		>
			<div
				class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-center justify-center gap-[32px]"
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
												? 'text-primary'
												: 'text-foreground opacity-60'
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
						<div
							class="relative flex min-w-px flex-[1_0_0] content-stretch items-center justify-end gap-[16px]"
							data-name="Flex Horizontal"
						>
							<div
								class="relative flex shrink-0 flex-col content-stretch items-end justify-center"
								data-name="Flex Horizontal"
							>
								<div
									class="relative isolate flex shrink-0 flex-wrap content-center items-center overflow-clip rounded-[10px] bg-muted p-[3px]"
									data-name="Advance Tabs"
								>
									<div
										class="relative z-[1] flex w-[358px] shrink-0 content-stretch items-center"
										data-name="Items"
									>
										<a
											href={viewHref(false)}
											class="relative flex shrink-0 content-stretch items-center justify-center gap-[4px] rounded-[10px] px-[8px] py-[4px]"
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
												class="relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-foreground opacity-60"
											>
												{m.storefront_listing_view_grid()}
											</p>
										</a>
										<a
											href={viewHref(true)}
											class="relative flex shrink-0 content-stretch items-center justify-center gap-[4px] overflow-clip rounded-[10px] border border-solid border-border bg-card px-[8px] py-[4px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
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
												class="relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-foreground"
											>
												{m.storefront_listing_view_list()}
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
										class="relative flex min-h-px w-full flex-[1_0_0] content-stretch items-center gap-[6px] rounded-[10px] border border-solid border-border bg-card px-[10px] py-[6px]"
										data-name="SelectValue"
									>
										<select
											class="w-full cursor-pointer appearance-none bg-transparent font-['Geist:Regular'] text-[12px] leading-[16px] font-normal text-muted-foreground outline-none"
											value={filters.sort ?? 'recommended'}
											onchange={(event) => changeSort(event.currentTarget.value as SortValue)}
										>
											<option value="recommended">{m.storefront_listing_sort_recommended()}</option>
											<option value="popular">{m.storefront_listing_sort_popular()}</option>
											<option value="price_asc">{m.storefront_listing_sort_price_asc()}</option>
											<option value="price_desc">{m.storefront_listing_sort_price_desc()}</option>
											<option value="newest">{m.storefront_listing_sort_newest()}</option>
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
						{#if filters.categoryId && selectedCategory}
							<button
								type="button"
								class="relative flex h-[26px] shrink-0 cursor-pointer content-stretch items-center justify-center gap-[4px] rounded-[9999px] px-[12px] py-[4px]"
								style="background-image: linear-gradient(90deg, color-mix(in oklab, var(--foreground) 10%, transparent) 0%, color-mix(in oklab, var(--foreground) 10%, transparent) 100%), linear-gradient(90deg, var(--background) 0%, var(--background) 100%)"
								data-name="Soft Badge"
								onclick={() => selectCategory(filters.categoryId ?? '')}
							>
								<p
									class="font-['Geist:Medium'] text-[12px] leading-[16px] font-medium text-primary"
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
						{#if filters.brandId && brandName}
							<button
								type="button"
								class="relative flex h-[26px] shrink-0 cursor-pointer content-stretch items-center justify-center gap-[4px] rounded-[9999px] px-[12px] py-[4px]"
								style="background-image: linear-gradient(90deg, color-mix(in oklab, var(--foreground) 10%, transparent) 0%, color-mix(in oklab, var(--foreground) 10%, transparent) 100%), linear-gradient(90deg, var(--background) 0%, var(--background) 100%)"
								data-name="Soft Badge"
								onclick={() => {
									filters.brandId = undefined;
									page = 1;
									syncUrl({ brandId: null, page: null });
								}}
							>
								<p
									class="font-['Geist:Medium'] text-[12px] leading-[16px] font-medium text-primary"
								>
									{brandName}
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
						{#if priceLabel}
							<button
								type="button"
								class="relative flex h-[26px] shrink-0 cursor-pointer content-stretch items-center justify-center gap-[4px] rounded-[9999px] px-[12px] py-[4px]"
								style="background-image: linear-gradient(90deg, color-mix(in oklab, var(--foreground) 10%, transparent) 0%, color-mix(in oklab, var(--foreground) 10%, transparent) 100%), linear-gradient(90deg, var(--background) 0%, var(--background) 100%)"
								data-name="Soft Badge"
								onclick={clearPrice}
							>
								<p
									class="font-['Geist:Medium'] text-[12px] leading-[16px] font-medium text-primary"
								>
									{priceLabel}
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
								style="background-image: linear-gradient(90deg, color-mix(in oklab, var(--foreground) 10%, transparent) 0%, color-mix(in oklab, var(--foreground) 10%, transparent) 100%), linear-gradient(90deg, var(--background) 0%, var(--background) 100%)"
								data-name="Soft Badge"
								onclick={() => {
									filters.color = undefined;
									page = 1;
									syncUrl({ color: null, page: null });
								}}
							>
								<p
									class="font-['Geist:Medium'] text-[12px] leading-[16px] font-medium text-primary"
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
					<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground">
						{loading
							? m.storefront_listing_loading()
							: m.storefront_listing_total({ count: result?.total ?? 0 })}
					</p>
				</div>
				{#if loading}
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px]"
						data-name="Flex Vertical"
					>
						{#each [0, 1, 2, 3, 4] as skeleton (skeleton)}
							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-start"
								data-name="lisitng Product Card"
							>
								<div
									class="h-[220px] w-full shrink-0 animate-pulse rounded-[14px] bg-muted"
									data-name="Card"
								></div>
							</div>
						{/each}
					</div>
				{:else if error}
					<p class="w-full font-['Geist:Regular'] text-[16px] leading-[24px] text-destructive">
						{error}
					</p>
				{:else if result && result.data.length === 0}
					<p class="w-full font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground">
						{m.storefront_listing_empty()}
					</p>
				{:else if result}
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px]"
						data-name="Flex Vertical"
					>
						{#each result.data as product (product.id)}
							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-start"
								data-name="lisitng Product Card"
							>
								<StorefrontProductCard {product} layout="list" />
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
								class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-foreground"
							>
								{m.common_previous()}
							</p>
						</button>
						{#each pageNumbers as number (number)}
							<button
								type="button"
								onclick={() => selectPage(number)}
								class={`relative flex size-[32px] shrink-0 cursor-pointer content-stretch items-center justify-center rounded-[10px] ${
									number === page ? 'border border-solid border-border bg-card' : ''
								}`}
								data-name={number === page ? 'Outline Button' : 'Ghost Button'}
							>
								<p
									class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-foreground"
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
								class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-foreground"
							>
								{m.common_next()}
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

<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight } from '@lucide/svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import ProductCarousel from '#lib/frontend/components/storefront/ProductCarousel.svelte';
	import DealCountdown from '#lib/frontend/components/storefront/DealCountdown.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
	import { discountPercent, formatMoney } from '#lib/frontend/modules/commerce/format.ts';

	const categoryBanners = $derived(home.banners.filter((banner) => banner.key === 'category'));
	const heroBanner = $derived(home.banner('category') ?? home.banner('hero'));
	const rootCategories = $derived(home.categories.filter((category) => category.parentId === null));
	const firstDeal = $derived(home.deals[0]);
	const remainingDeals = $derived(home.deals.slice(1));

	onMount(() => {
		void home.ensure();
	});
</script>

<div
	class="relative flex size-full flex-col content-stretch items-center bg-white"
	data-name="Category"
>
	<SiteHeader />

	{#if categoryBanners.length > 1}
		<section
			class="relative flex w-full shrink-0 content-stretch items-center justify-center px-4 py-[56px] sm:px-8"
			data-name="Hero"
		>
			<div class="grid w-full grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
				{#each categoryBanners as banner (banner.id)}
					<a
						href={banner.ctaUrl ?? '/products'}
						class="group relative flex min-h-[240px] flex-col justify-end overflow-clip rounded-[8px] bg-[#171717] p-[24px] text-white"
						data-name="Card"
					>
						{#if banner.imageUrl}
							<img
								src={banner.imageUrl}
								alt={banner.title}
								loading="lazy"
								class="pointer-events-none absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105"
							/>
							<div class="pointer-events-none absolute inset-0 bg-black/40"></div>
						{:else}
							<ImagePlaceholder variant="dark" class="pointer-events-none absolute inset-0" />
						{/if}
						<div class="relative flex flex-col gap-[8px]">
							<p class="font-['Geist:Bold'] text-[24px] leading-[32px] font-bold">
								{banner.title}
							</p>
							{#if banner.subtitle}
								<p class="font-['Geist:Regular'] text-[16px] leading-[24px]">
									{banner.subtitle}
								</p>
							{/if}
							{#if banner.ctaLabel}
								<span
									class="mt-[8px] inline-flex w-fit items-center gap-[6px] rounded-[10px] bg-[#f5f5f5] px-[16px] py-[8px] font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#171717]"
								>
									{banner.ctaLabel}
									<ArrowRight class="size-[16px]" />
								</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</section>
	{:else if heroBanner}
		<section
			class="relative flex w-full items-center justify-center overflow-clip px-4 py-4 sm:px-8"
			data-name="Hero"
		>
			<div
				class="relative flex min-h-[336px] w-full items-center overflow-clip rounded-[8px] bg-[#171717]"
			>
				{#if heroBanner.imageUrl}
					<img
						loading="lazy"
						decoding="async"
						src={heroBanner.imageUrl}
						alt={heroBanner.title}
						class="pointer-events-none absolute inset-0 size-full object-cover"
					/>
					<div class="pointer-events-none absolute inset-0 bg-black/40"></div>
				{:else}
					<ImagePlaceholder variant="dark" class="pointer-events-none absolute inset-0" />
				{/if}
				<div
					class="relative flex w-full max-w-[600px] flex-col items-start gap-[16px] px-[40px] py-[40px] text-white"
				>
					<h1 class="font-['Geist:Bold'] text-[36px] leading-[40px] font-bold">
						{heroBanner.title}
					</h1>
					{#if heroBanner.subtitle}
						<p class="font-['Geist:Regular'] text-[18px] leading-[28px]">
							{heroBanner.subtitle}
						</p>
					{/if}
					{#if heroBanner.ctaLabel}
						<a
							href={heroBanner.ctaUrl ?? '/products'}
							class="flex items-center justify-center gap-[6px] overflow-clip rounded-[10px] border border-solid border-[#f5f5f5] bg-[#f5f5f5] px-[16px] py-[8px] text-[#171717]"
							data-name="Solid button"
						>
							<span
								class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium whitespace-nowrap"
							>
								{heroBanner.ctaLabel}
							</span>
							<ArrowRight class="size-[16px]" />
						</a>
					{/if}
				</div>
			</div>
		</section>
	{/if}

	{#each rootCategories as root (root.id)}
		{@const children = home.categories.filter((category) => category.parentId === root.id)}
		{@const cards = children.length > 0 ? children : [root]}
		<section
			class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center px-4 py-[56px] sm:px-8"
			data-name="Product category"
		>
			<div
				class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[24px] overflow-clip"
				data-name="Flex Vertical"
			>
				<div
					class="relative flex w-full shrink-0 content-stretch items-start justify-between gap-[16px]"
					data-name="Flex Horizontal"
				>
					<h2
						class="relative min-w-px flex-[1_0_0] font-['Geist:Bold'] text-[30px] leading-[36px] font-bold [word-break:break-word] text-[#0a0a0a]"
					>
						{root.name}
					</h2>
					<a
						href={`/products?categoryId=${root.id}`}
						class="shrink-0 font-['Geist:Medium'] text-[18px] leading-[28px] font-medium text-[#0a0a0a] transition hover:text-[#525252]"
					>
						View All
					</a>
				</div>
				<div
					class="relative grid w-full shrink-0 grid-cols-1 content-stretch items-start gap-[16px] sm:grid-cols-2 lg:grid-cols-4"
					data-name="Flex Horizontal"
				>
					{#each cards as category (category.id)}
						<a
							href={`/products?categoryId=${category.id}`}
							class="group flex flex-col overflow-hidden rounded-[14px] bg-white pb-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(10,10,10,0.12)]"
							data-name="Categories Card"
						>
							<div
								class="relative aspect-square w-full overflow-hidden bg-[#f5f5f5]"
								data-name="card-header"
							>
								{#if category.imageUrl}
									<img
										src={category.imageUrl}
										alt={category.name}
										loading="lazy"
										class="size-full object-cover transition duration-300 group-hover:scale-105"
									/>
								{:else}
									<ImagePlaceholder class="size-full" label={category.name} />
								{/if}
							</div>
							<div class="flex w-full flex-col gap-[4px] px-[16px] pt-[16px]" data-name="card-body">
								<p
									class="font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
								>
									{category.name}
								</p>
								<p class="text-[14px] leading-[20px] text-[#737373]">
									{category.productCount} products
								</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</section>
	{/each}

	{#if home.brands.length > 0}
		<section
			class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center px-4 py-[56px] sm:px-8"
			data-name="Product category"
		>
			<div
				class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center gap-[32px] overflow-clip"
				data-name="Flex Vertical"
			>
				<div
					class="relative flex w-full shrink-0 content-stretch items-start justify-between"
					data-name="Flex Horizontal"
				>
					<h2
						class="relative min-w-px flex-[1_0_0] font-['Geist:Bold'] text-[30px] leading-[36px] font-bold [word-break:break-word] text-[#0a0a0a]"
					>
						Grand Global Brands
					</h2>
				</div>
				<div
					class="relative grid w-full shrink-0 grid-cols-2 content-stretch items-start gap-[16px] sm:grid-cols-3 lg:grid-cols-5"
					data-name="Flex Horizontal"
				>
					{#each home.brands as brand (brand.id)}
						<a
							href={`/products?brandId=${brand.id}`}
							class="group flex flex-col items-center gap-[12px] rounded-[14px] bg-white px-[16px] py-[24px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(10,10,10,0.12)]"
							data-name="Categories Card"
						>
							<div class="flex h-[64px] w-full items-center justify-center" data-name="card-header">
								{#if brand.logoUrl}
									<img
										src={brand.logoUrl}
										alt={brand.name}
										loading="lazy"
										class="max-h-[56px] max-w-[140px] object-contain"
									/>
								{:else}
									<span
										class="font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold text-[#0a0a0a]"
									>
										{brand.name}
									</span>
								{/if}
							</div>
							<div class="flex w-full flex-col items-center" data-name="card-body">
								<p
									class="text-center font-['Geist:Medium'] text-[14px] leading-[20px] text-[#0a0a0a]"
								>
									{brand.name}
								</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	{#if firstDeal}
		{@const discount = discountPercent(firstDeal.price, firstDeal.compareAtPrice)}
		<section
			class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center px-4 py-[56px] sm:px-8"
			data-name="Feature"
		>
			<div
				class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center gap-[32px]"
				data-name="Flex Vertical"
			>
				<div
					class="relative flex w-full shrink-0 content-stretch items-center justify-between gap-[16px]"
					data-name="Flex Horizontal"
				>
					<h2
						class="relative min-w-px flex-[1_0_0] font-['Geist:Bold'] text-[30px] leading-[36px] font-bold [word-break:break-word] text-[#0a0a0a]"
					>
						Deals of the Day
					</h2>
					<a
						href="/products?deal=true"
						class="shrink-0 font-['Geist:Medium'] text-[18px] leading-[28px] font-medium text-[#0a0a0a] transition hover:text-[#525252]"
					>
						View All
					</a>
				</div>
				<div
					class="relative flex w-full shrink-0 overflow-clip rounded-[14px] bg-[#171717]"
					data-name="Card"
				>
					{#if firstDeal.imageUrl}
						<img
							loading="lazy"
							decoding="async"
							src={firstDeal.imageUrl}
							alt={firstDeal.name}
							class="pointer-events-none absolute inset-0 size-full object-cover"
						/>
						<div class="pointer-events-none absolute inset-0 bg-black/50"></div>
					{:else}
						<ImagePlaceholder variant="dark" class="pointer-events-none absolute inset-0" />
					{/if}
					<div
						class="relative flex w-full flex-col gap-[16px] px-[24px] py-[24px] text-white lg:max-w-[640px]"
					>
						<div class="flex flex-col gap-[8px]">
							{#if firstDeal.brandName}
								<p class="text-[14px] leading-[20px] tracking-wide text-white/70 uppercase">
									{firstDeal.brandName}
								</p>
							{/if}
							<p class="font-['Geist:Bold'] text-[36px] leading-[40px] font-bold">
								{firstDeal.name}
							</p>
							{#if firstDeal.shortDescription}
								<p class="font-['Geist:Regular'] text-[18px] leading-[28px]">
									{firstDeal.shortDescription}
								</p>
							{/if}
						</div>
						<div class="flex flex-wrap items-baseline gap-[8px]">
							<span class="text-[24px] leading-[32px] font-semibold">
								{formatMoney(firstDeal.price, firstDeal.currency)}
							</span>
							{#if firstDeal.compareAtPrice && firstDeal.compareAtPrice > firstDeal.price}
								<span class="text-[18px] leading-[28px] text-white/70 line-through">
									{formatMoney(firstDeal.compareAtPrice, firstDeal.currency)}
								</span>
								<span
									class="rounded-full bg-[#dc2626] px-[10px] py-[2px] text-[14px] leading-[20px] font-medium"
								>
									-{discount}%
								</span>
							{/if}
						</div>
						<div class="flex w-full max-w-[420px] flex-col gap-[8px]" data-name="Flex Vertical">
							<p class="font-['Geist:SemiBold'] text-[16px] leading-[24px] font-semibold">
								Offer expires in:
							</p>
							<DealCountdown endsAt={firstDeal.dealEndsAt} />
						</div>
						<a
							href={`/products/${firstDeal.slug}`}
							class="flex w-fit items-center justify-center gap-[6px] overflow-clip rounded-[10px] bg-[#dc2626] px-[16px] py-[8px] text-white"
							data-name="Solid Button"
						>
							<span
								class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium whitespace-nowrap"
							>
								Shop now
							</span>
							<ArrowRight class="size-[16px]" />
						</a>
					</div>
				</div>
			</div>
		</section>
	{/if}

	{#if remainingDeals.length > 0}
		<ProductCarousel
			title="Deals of the Day"
			products={remainingDeals}
			viewAllHref="/products?deal=true"
		/>
	{/if}

	<ProductCarousel
		title="New Arrival Products"
		products={home.newArrivals}
		viewAllHref="/products?newArrival=true"
	/>

	{#if home.popular.length > 0}
		<ProductCarousel
			title="Popular Products"
			products={home.popular}
			viewAllHref="/products?sort=popular"
		/>
	{/if}

	<SiteFooter />
</div>

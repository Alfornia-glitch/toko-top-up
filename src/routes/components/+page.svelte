<script lang="ts">
	import { onMount } from 'svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import AccountSidebar from '#lib/frontend/components/AccountSidebar.svelte';
	import StorefrontProductCard from '#lib/frontend/components/storefront/StorefrontProductCard.svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import Pagination from '#lib/frontend/components/ui/Pagination.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	const showcaseProducts = $derived(
		(home.featured.length > 0 ? home.featured : home.popular).slice(0, 3)
	);

	onMount(() => {
		void home.ensure();
	});
</script>

<div class="min-h-screen bg-white" data-name="Components">
	<SiteHeader />
	<main class="mx-auto flex max-w-[1280px] flex-col gap-16 px-8 py-12">
		<section class="flex w-full flex-col items-center gap-8 px-8 py-14" data-name="Brands">
			<h2
				class="font-['Geist:Bold'] text-[30px] leading-9 max-[480px]:text-2xl max-[480px]:leading-8"
			>
				Shop By Brands
			</h2>
			{#if home.brands.length > 0}
				<div class="flex w-full max-w-[976px] flex-wrap justify-center gap-8">
					{#each home.brands as brand (brand.id)}
						<a
							href={`/products?brandId=${brand.id}`}
							class="flex h-20 w-[136px] items-center justify-center rounded-[14px] border border-[#e5e5e5] bg-white px-3 transition hover:border-[#a3a3a3]"
							data-name="Brand"
						>
							{#if brand.logoUrl}
								<img
									src={brand.logoUrl}
									alt={brand.name}
									loading="lazy"
									class="max-h-8 max-w-[110px] object-contain"
								/>
							{:else}
								<span class="text-center font-['Geist:SemiBold'] text-sm leading-5 text-[#0a0a0a]">
									{brand.name}
								</span>
							{/if}
						</a>
					{/each}
				</div>
			{:else}
				<p class="font-['Geist:Regular'] text-sm leading-5 text-[#737373]">
					Brands will appear here once available.
				</p>
			{/if}
		</section>

		<section class="flex flex-col gap-6" data-name="Categories">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<h2
					class="font-['Geist:Bold'] text-[30px] leading-9 max-[480px]:text-2xl max-[480px]:leading-8"
				>
					Shop By Category
				</h2>
				<a
					href="/categories"
					class="font-['Geist:Medium'] text-sm leading-5 text-[#0a0a0a] transition hover:text-[#525252]"
				>
					View All
				</a>
			</div>
			{#if home.categories.length > 0}
				<div class="flex flex-wrap gap-2">
					{#each home.categories as category (category.id)}
						<a
							href={`/products?categoryId=${category.id}`}
							class="rounded-full border border-[#e5e5e5] bg-white px-4 py-2 font-['Geist:Medium'] text-sm leading-5 text-[#0a0a0a] transition hover:border-[#a3a3a3] hover:bg-[#f5f5f5]"
							data-name="Category Chip"
						>
							{category.name}
						</a>
					{/each}
				</div>
			{:else}
				<p class="font-['Geist:Regular'] text-sm leading-5 text-[#737373]">
					Categories will appear here once available.
				</p>
			{/if}
		</section>

		<section class="flex flex-col gap-6" data-name="Products">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<h2
					class="font-['Geist:Bold'] text-[30px] leading-9 max-[480px]:text-2xl max-[480px]:leading-8"
				>
					Featured Products
				</h2>
				<a
					href="/products"
					class="font-['Geist:Medium'] text-sm leading-5 text-[#0a0a0a] transition hover:text-[#525252]"
				>
					View All
				</a>
			</div>
			{#if showcaseProducts.length > 0}
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each showcaseProducts as product (product.id)}
						<StorefrontProductCard {product} />
					{/each}
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each [0, 1, 2] as index (index)}
						<div
							class="flex aspect-[3/4] flex-col overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-white"
							data-name="Product Card"
						>
							<ImagePlaceholder class="flex-1" label="Product image" />
							<p class="px-4 py-4 font-['Geist:Regular'] text-sm leading-5 text-[#737373]">
								Products will appear here once available.
							</p>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<section class="flex flex-col gap-6" data-name="Buttons">
			<h2
				class="font-['Geist:Bold'] text-[30px] leading-9 max-[480px]:text-2xl max-[480px]:leading-8"
			>
				Buttons
			</h2>
			<div class="flex flex-wrap items-center gap-3">
				<Button>Button</Button>
				<Button variant="secondary">Button</Button>
				<Button variant="outline">Button</Button>
				<Button variant="ghost">Button</Button>
				<Button variant="destructive">Button</Button>
			</div>
		</section>

		<section class="flex flex-col gap-6" data-name="Badges">
			<h2
				class="font-['Geist:Bold'] text-[30px] leading-9 max-[480px]:text-2xl max-[480px]:leading-8"
			>
				Badges
			</h2>
			<div class="flex flex-wrap items-center gap-3">
				<Badge>Badge</Badge>
				<Badge variant="secondary">Badge</Badge>
				<Badge variant="outline">Badge</Badge>
				<Badge variant="destructive">Badge</Badge>
			</div>
		</section>

		<section class="flex flex-col gap-6" data-name="Pagination">
			<h2
				class="font-['Geist:Bold'] text-[30px] leading-9 max-[480px]:text-2xl max-[480px]:leading-8"
			>
				Pagination
			</h2>
			<Pagination />
		</section>

		<div class="flex flex-wrap items-start gap-12">
			<AccountSidebar />
			<div class="flex gap-4 pt-4">
				<Badge>Badge</Badge>
				<Badge variant="secondary">Badge</Badge>
			</div>
		</div>
	</main>
	<SiteFooter />
</div>

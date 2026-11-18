<script lang="ts">
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import StorefrontProductCard from '#lib/frontend/components/storefront/StorefrontProductCard.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
</script>

{#if home.featured.length > 0}
	<section class="w-full bg-white py-16" data-name="Storefront Live">
		<div class="mx-auto flex w-full max-w-[1280px] flex-col gap-12 px-4 lg:px-8">
			<div class="flex flex-col gap-6">
				<div class="flex items-end justify-between gap-4">
					<div>
						<h2
							class="text-[30px] leading-[36px] font-bold text-[#0a0a0a] max-[480px]:text-2xl max-[480px]:leading-8"
						>
							Featured Products
						</h2>
						<p class="text-sm text-[#737373]">Hand-picked favourites from the live catalog</p>
					</div>
					<a
						href="/products?featured=true"
						class="shrink-0 text-sm font-medium text-[#0a0a0a] transition hover:text-[#525252]"
					>
						View all
					</a>
				</div>
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
					{#each home.featured as product (product.id)}
						<StorefrontProductCard {product} />
					{/each}
				</div>
			</div>

			{#if home.brands.length > 0}
				<div class="flex flex-col gap-4">
					<h3 class="text-xl font-bold text-[#0a0a0a]">Shop by Brand</h3>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
						{#each home.brands as brand (brand.id)}
							<a
								href={`/products?brandId=${brand.id}`}
								class="flex h-20 items-center justify-center rounded-[14px] border border-[#e5e5e5] bg-white px-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(10,10,10,0.12)]"
							>
								{#if brand.logoUrl}
									<img
										src={brand.logoUrl}
										alt={brand.name}
										loading="lazy"
										class="max-h-10 w-auto object-contain"
									/>
								{:else}
									<span class="text-sm font-semibold text-[#0a0a0a]">{brand.name}</span>
								{/if}
							</a>
						{/each}
					</div>
				</div>
			{/if}

			{#if home.categories.length > 0}
				<div class="flex flex-col gap-4">
					<h3 class="text-xl font-bold text-[#0a0a0a]">Shop by Category</h3>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
						{#each home.categories as category (category.id)}
							<a
								href={`/products?categoryId=${category.id}`}
								class="group flex flex-col items-center gap-3 rounded-[14px] border border-[#e5e5e5] bg-white p-4 text-center transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(10,10,10,0.12)]"
							>
								<div class="relative size-20 overflow-hidden rounded-full bg-[#f5f5f5]">
									{#if category.imageUrl}
										<img
											src={category.imageUrl}
											alt={category.name}
											loading="lazy"
											class="size-full object-cover transition duration-300 group-hover:scale-105"
										/>
									{:else}
										<ImagePlaceholder class="size-full rounded-full" label={category.name} />
									{/if}
								</div>
								<div class="flex flex-col gap-1">
									<span class="text-sm font-semibold text-[#0a0a0a]">{category.name}</span>
									<span class="text-xs text-[#737373]">{category.productCount} products</span>
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</section>
{/if}

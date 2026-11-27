<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import StorefrontProductCard from '#lib/frontend/components/storefront/StorefrontProductCard.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
</script>

{#if home.featured.length > 0}
	<section class="w-full bg-card py-16" data-name="Storefront Live">
		<div class="mx-auto flex w-full max-w-[1280px] flex-col gap-12 px-4 lg:px-8">
			<div class="flex flex-col gap-6">
				<div class="flex items-end justify-between gap-4">
					<div>
						<h2
							class="text-[30px] leading-[36px] font-bold text-foreground max-[480px]:text-2xl max-[480px]:leading-8"
						>
							{m.components_live_featured_title()}
						</h2>
						<p class="text-sm text-muted-foreground">{m.components_live_featured_subtitle()}</p>
					</div>
					<a
						href="/products?featured=true"
						class="shrink-0 text-sm font-medium text-foreground transition hover:text-muted-foreground"
					>
						{m.common_view_all()}
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
					<h3 class="text-xl font-bold text-foreground">{m.components_shop_by_brand()}</h3>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
						{#each home.brands as brand (brand.id)}
							<a
								href={`/products?brandId=${brand.id}`}
								class="flex h-20 items-center justify-center rounded-[14px] border border-border bg-card px-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_color-mix(in_oklab,var(--foreground)_12%,transparent)]"
							>
								{#if brand.logoUrl}
									<img
										src={brand.logoUrl}
										alt={brand.name}
										loading="lazy"
										class="max-h-10 w-auto object-contain"
									/>
								{:else}
									<span class="text-sm font-semibold text-foreground">{brand.name}</span>
								{/if}
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</section>
{/if}

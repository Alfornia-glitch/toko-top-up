<script lang="ts" module>
	export interface StorefrontProduct {
		id: string;
		sku: string;
		name: string;
		slug: string;
		shortDescription: string | null;
		priceCents: number;
		compareAtPriceCents: number | null;
		currency: string;
		ratingAvg: number;
		ratingCount: number;
		soldCount: number;
		isFeatured: boolean;
		isNewArrival: boolean;
		isDeal: boolean;
		brandName: string | null;
		categoryName: string | null;
		imageUrl: string | null;
		stock: number;
	}
</script>

<script lang="ts">
	import { Star } from '@lucide/svelte';
	import WishlistButton from '#lib/frontend/components/shared/WishlistButton.svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';

	let { product }: { product: StorefrontProduct } = $props();

	let failedUrl = $state<string | null>(null);

	function formatMoney(cents: number, currency: string) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency || 'USD'
		}).format(cents / 100);
	}

	function ratingValue(value: number) {
		if (!Number.isFinite(value) || value <= 0) return 0;
		return Math.min(5, value > 5 ? value / 100 : value);
	}

	const rating = $derived(ratingValue(product.ratingAvg));
	const compareAt = $derived(
		product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents
			? product.compareAtPriceCents
			: null
	);
	const discount = $derived(
		compareAt ? Math.round(((compareAt - product.priceCents) / compareAt) * 100) : 0
	);
</script>

<div class="group relative h-full">
	<a
		href={`/products/${product.slug}`}
		data-name="Product Card"
		class="flex h-full flex-col overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(10,10,10,0.12)]"
	>
		<div class="relative aspect-square w-full overflow-hidden bg-[#f5f5f5]">
			{#if product.imageUrl && failedUrl !== product.imageUrl}
				<img
					src={product.imageUrl}
					alt={product.name}
					loading="lazy"
					onerror={() => (failedUrl = product.imageUrl)}
					class="size-full object-cover transition duration-300 group-hover:scale-105"
				/>
			{:else}
				<ImagePlaceholder class="size-full" label={product.name} />
			{/if}
			<div class="absolute top-3 left-3 flex flex-wrap gap-2">
				{#if product.isNewArrival}
					<Badge class="rounded-full bg-[#16a34a] px-2.5 text-white">New</Badge>
				{/if}
				{#if compareAt}
					<Badge class="rounded-full bg-[#dc2626] px-2.5 text-white">-{discount}%</Badge>
				{/if}
			</div>
		</div>
		<div class="flex flex-1 flex-col gap-3 px-4 py-4">
			<div class="flex flex-col gap-1">
				{#if product.brandName}
					<p class="text-xs font-medium tracking-wide text-[#737373] uppercase">
						{product.brandName}
					</p>
				{/if}
				<p class="line-clamp-2 text-sm font-semibold text-[#0a0a0a]">{product.name}</p>
			</div>
			<div class="flex items-center gap-1.5">
				<div class="flex items-center gap-0.5">
					{#each [0, 1, 2, 3, 4] as index (index)}
						<Star
							class={`size-3.5 ${
								index < Math.round(rating) ? 'fill-[#d97706] text-[#d97706]' : 'text-[#d4d4d4]'
							}`}
						/>
					{/each}
				</div>
				<span class="text-xs text-[#737373]">{rating.toFixed(1)} ({product.ratingCount})</span>
			</div>
			<div class="mt-auto flex items-baseline gap-2">
				<span class="text-base font-semibold text-[#0a0a0a]">
					{formatMoney(product.priceCents, product.currency)}
				</span>
				{#if compareAt}
					<span class="text-sm text-[#737373] line-through">
						{formatMoney(compareAt, product.currency)}
					</span>
				{/if}
			</div>
		</div>
	</a>
	<div class="absolute top-3 right-3 z-10">
		<WishlistButton productId={product.id} />
	</div>
</div>

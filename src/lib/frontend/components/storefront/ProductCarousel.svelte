<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import StorefrontProductCard, {
		type StorefrontProduct
	} from '#lib/frontend/components/storefront/StorefrontProductCard.svelte';

	let {
		title,
		products,
		viewAllHref,
		emptyLabel = m.components_product_carousel_empty()
	}: {
		title: string;
		products: StorefrontProduct[];
		viewAllHref?: string;
		emptyLabel?: string;
	} = $props();
</script>

<div
	class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center bg-card py-[96px] max-[480px]:py-9"
	data-name="Product list"
>
	<div
		class="relative flex w-full max-w-[1280px] shrink-0 flex-col content-stretch items-center justify-center gap-[32px] px-[32px] max-[480px]:px-3.5"
		data-name="Flex Vertical"
	>
		<div
			class="relative flex w-full shrink-0 content-stretch items-center justify-between gap-[16px]"
			data-name="Flex Horizontal"
		>
			<p
				class="relative min-w-px flex-[1_0_0] font-['Geist:Bold'] text-[30px] leading-[36px] font-bold [word-break:break-word] text-foreground max-[480px]:text-2xl max-[480px]:leading-8"
			>
				{title}
			</p>
			{#if viewAllHref}
				<a
					href={viewAllHref}
					class="relative shrink-0 font-['Geist:Medium'] text-[18px] leading-[28px] font-medium text-foreground transition hover:text-muted-foreground"
				>
					{m.common_view_all()}
				</a>
			{/if}
		</div>
		{#if products.length === 0}
			<p class="relative w-full shrink-0 text-center text-[16px] leading-[24px] text-muted-foreground">
				{emptyLabel}
			</p>
		{:else}
			<div class="relative grid w-full shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{#each products as product (product.id)}
					<StorefrontProductCard {product} />
				{/each}
			</div>
		{/if}
	</div>
</div>

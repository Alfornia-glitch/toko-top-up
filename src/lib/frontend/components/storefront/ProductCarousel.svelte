<script lang="ts">
	import StorefrontProductCard, {
		type StorefrontProduct
	} from '#lib/frontend/components/storefront/StorefrontProductCard.svelte';

	let {
		title,
		products,
		viewAllHref,
		emptyLabel = 'No products available.'
	}: {
		title: string;
		products: StorefrontProduct[];
		viewAllHref?: string;
		emptyLabel?: string;
	} = $props();
</script>

<div
	class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center bg-white py-[96px]"
	data-name="Product list"
>
	<div
		class="relative flex w-full max-w-[1280px] shrink-0 flex-col content-stretch items-center justify-center gap-[32px] px-[32px]"
		data-name="Flex Vertical"
	>
		<div
			class="relative flex w-full shrink-0 content-stretch items-center justify-between gap-[16px]"
			data-name="Flex Horizontal"
		>
			<p
				class="relative min-w-px flex-[1_0_0] font-['Geist:Bold'] text-[30px] leading-[36px] font-bold [word-break:break-word] text-[#0a0a0a]"
			>
				{title}
			</p>
			{#if viewAllHref}
				<a
					href={viewAllHref}
					class="relative shrink-0 font-['Geist:Medium'] text-[18px] leading-[28px] font-medium text-[#0a0a0a] transition hover:text-[#525252]"
				>
					View All
				</a>
			{/if}
		</div>
		{#if products.length === 0}
			<p class="relative w-full shrink-0 text-center text-[16px] leading-[24px] text-[#737373]">
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

<script lang="ts">
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
</script>

<div
	class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-end bg-white py-[56px]"
	data-name="Flex Vertical"
>
	<div
		class="relative flex w-full max-w-[1280px] shrink-0 flex-col content-stretch items-center justify-center gap-[32px] px-[32px]"
		data-name="Flex Vertical"
	>
		<p
			class="relative w-full shrink-0 text-start font-['Geist:Bold'] text-[30px] leading-[36px] font-bold [word-break:break-word] text-[#0a0a0a]"
		>
			Shop By Brands
		</p>
		<div
			class="relative flex w-full shrink-0 flex-wrap content-stretch items-center justify-start gap-[32px]"
			data-name="Brand Logos"
		>
			{#each home.brands as brand (brand.id)}
				<a
					href={`/products?brandId=${brand.id}`}
					class="relative flex w-[136px] shrink-0 flex-col content-stretch items-center gap-[16px] overflow-clip rounded-[14px] border border-solid border-[#e5e5e5] bg-white py-[24px] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(10,10,10,0.12)]"
					data-name="Card"
				>
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-center px-[24px]"
						data-name="card-body"
					>
						{#if brand.logoUrl}
							<img
								src={brand.logoUrl}
								alt={brand.name}
								loading="lazy"
								class="h-[32px] w-auto max-w-full object-contain"
							/>
						{:else}
							<span class="text-center text-[14px] leading-[20px] font-semibold text-[#0a0a0a]">
								{brand.name}
							</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>

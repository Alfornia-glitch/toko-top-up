<script lang="ts">
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	const imgIcon4 = '/assets/b9233.svg';
	const imgIcon5 = '/assets/785e8.svg';

	const categories = $derived(home.categories.slice(0, 6));
</script>

<div
	class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center bg-white pt-[96px]"
	data-name="Category"
>
	<div
		class="relative flex w-full max-w-[1280px] shrink-0 flex-col content-stretch items-center gap-[32px] px-[32px]"
		data-name="Flex Vertical"
	>
		<div
			class="relative flex w-full shrink-0 content-stretch items-start gap-[32px] [word-break:break-word] text-[#0a0a0a]"
			data-name="Flex Horizontal"
		>
			<p
				class="relative min-w-px flex-[1_0_0] font-['Geist:Bold'] text-[30px] leading-[36px] font-bold"
			>
				Shop by Category
			</p>
			<a
				href="/categories"
				class="relative min-w-px flex-[1_0_0] text-right font-['Geist:Medium'] text-[18px] leading-[28px] font-medium transition hover:text-[#525252]"
			>
				View All
			</a>
		</div>
		<div
			class="relative flex w-full shrink-0 content-stretch items-start gap-[16px]"
			data-name="Flex Horizontal"
		>
			<div
				class="absolute top-1/2 left-[-16px] flex w-[1247px] -translate-y-1/2 content-stretch items-center justify-between"
				data-name="Arrow Icon"
			>
				<div class="relative flex shrink-0 items-center justify-center">
					<div class="flex-none -scale-y-100 rotate-180">
						<div class="relative size-[30px]" data-name="ICON">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgIcon4} />
						</div>
					</div>
				</div>
				<div class="relative size-[30px] shrink-0" data-name="ICON">
					<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgIcon5} />
				</div>
			</div>
			{#each categories as category (category.id)}
				<div
					class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-center gap-[16px]"
					data-name="Flex Vertical"
				>
					<a
						href={`/products?categoryId=${category.id}`}
						class="flex flex-col items-center gap-[16px]"
					>
						<div
							class="relative size-[124px] shrink-0 overflow-hidden rounded-full bg-[#f5f5f5]"
							data-name="Image"
						>
							{#if category.imageUrl}
								<img
									src={category.imageUrl}
									alt={category.name}
									loading="lazy"
									class="absolute inset-0 size-full object-cover"
								/>
							{:else}
								<ImagePlaceholder
									class="absolute inset-0 rounded-full"
									variant="ghost"
									label={category.name}
								/>
							{/if}
						</div>
						<p
							class="relative w-[min-content] min-w-full shrink-0 text-center font-['Geist:Medium'] text-[18px] leading-[28px] font-medium [word-break:break-word] text-[#0a0a0a]"
						>
							{category.name}
						</p>
						<p
							class="relative w-full shrink-0 text-center font-['Geist:Regular'] text-[14px] leading-[20px] font-normal text-[#737373]"
						>
							{category.productCount} products
						</p>
					</a>
				</div>
			{/each}
		</div>
	</div>
</div>

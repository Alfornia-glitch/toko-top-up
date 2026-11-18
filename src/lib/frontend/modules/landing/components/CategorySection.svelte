<script lang="ts">
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Carousel from '#lib/frontend/components/ui/carousel/index.ts';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	const categories = $derived(home.categories);
</script>

<section class="flex w-full flex-col items-center bg-white pt-24" data-name="Category">
	<div class="flex w-full max-w-[1280px] flex-col gap-8 px-8">
		<div class="flex items-end justify-between gap-8 text-[#0a0a0a]">
			<h2 class="text-3xl leading-9 font-bold">Shop by Category</h2>
			<Button variant="link" href="/categories" class="text-lg font-medium text-[#0a0a0a]">
				View All
			</Button>
		</div>

		<Carousel.Root opts={{ align: 'start', dragFree: true }} class="w-full px-12">
			<Carousel.Content>
				{#each categories as category (category.id)}
					<Carousel.Item class="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/6">
						<a
							href={`/products?categoryId=${category.id}`}
							class="group flex flex-col items-center gap-4 rounded-xl p-2 transition-colors outline-none hover:bg-[#f5f5f5] focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							<div
								class="relative size-[124px] shrink-0 overflow-hidden rounded-full bg-[#f5f5f5] ring-1 ring-black/5 transition-transform group-hover:scale-105"
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
							<div class="flex flex-col items-center gap-0.5 text-center">
								<p class="text-lg leading-7 font-medium break-words text-[#0a0a0a]">
									{category.name}
								</p>
								<p class="text-sm leading-5 text-[#737373]">{category.productCount} products</p>
							</div>
						</a>
					</Carousel.Item>
				{/each}
			</Carousel.Content>
			<Carousel.Previous class="start-0" />
			<Carousel.Next class="end-0" />
		</Carousel.Root>
	</div>
</section>

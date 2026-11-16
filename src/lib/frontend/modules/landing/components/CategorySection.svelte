<script lang="ts">
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	const categories = $derived(home.categories);
</script>

<section class="mx-auto w-full max-w-7xl px-4" data-name="Category" aria-labelledby="game-populer">
	<div class="mt-10 mb-4 flex items-center justify-between">
		<h3 id="game-populer" class="text-xl font-semibold">Kategori Game</h3>
		<a href="/categories" class="text-sm font-medium text-muted-foreground hover:text-foreground">
			Lihat semua
		</a>
	</div>

	{#if categories.length === 0}
		<p class="text-sm text-muted-foreground">Belum ada game.</p>
	{:else}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
			{#each categories as category (category.id)}
				<a
					href={`/products?categoryId=${category.id}`}
					class="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<Card.Root
						class="gap-0 overflow-hidden py-0 transition group-hover:-translate-y-0.5 group-hover:border-primary"
					>
						<div class="relative aspect-square bg-muted">
							{#if category.imageUrl}
								<img
									src={category.imageUrl}
									alt=""
									loading="lazy"
									draggable="false"
									class="absolute inset-0 size-full object-cover"
								/>
							{:else}
								<ImagePlaceholder class="absolute inset-0" variant="ghost" label={category.name} />
							{/if}
						</div>
						<div class="p-3">
							<p class="truncate text-sm font-semibold">{category.name}</p>
							<p class="mt-0.5 text-xs text-muted-foreground">{category.productCount} produk</p>
						</div>
					</Card.Root>
				</a>
			{/each}
		</div>
	{/if}
</section>

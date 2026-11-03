<script lang="ts">
	import { onMount } from 'svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';

	interface StorefrontCategory {
		id: string;
		name: string;
		slug: string;
		parentId: string | null;
		description: string | null;
		imageUrl: string | null;
		position: number;
		productCount: number;
	}

	let categories = $state<StorefrontCategory[]>([]);

	onMount(() => {
		void loadCategories();
	});

	async function loadCategories() {
		try {
			const response = await fetch('/api/storefront/categories');
			if (!response.ok) return;

			const payload = await response.json();
			categories = Array.isArray(payload.data) ? payload.data : [];
		} catch {
			categories = [];
		}
	}
</script>

{#if categories.length > 0}
	<section class="w-full bg-white py-10" data-name="Storefront Categories">
		<div class="mx-auto w-full max-w-[1280px] px-4 lg:px-8">
			<h2 class="mb-6 text-2xl font-bold text-[#0a0a0a]">Shop by Category</h2>
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
				{#each categories as category (category.id)}
					<a
						href={`/products?categoryId=${category.id}`}
						class="group flex flex-col items-center gap-3 rounded-[14px] border border-[#e5e5e5] bg-white p-4 text-center transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(10,10,10,0.12)]"
					>
						<div class="relative size-24 overflow-hidden rounded-full bg-[#f5f5f5]">
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
	</section>
{/if}

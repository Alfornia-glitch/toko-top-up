<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight } from '@lucide/svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import HeroSection from '#lib/frontend/modules/landing/components/regular/HeroSection.svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	const rootCategories = $derived(
		home.categories.filter((category) => category.parentId === null).slice(0, 8)
	);

	onMount(() => {
		void home.ensure();
	});
</script>

<div class="flex min-h-screen w-full flex-col bg-white">
	<SiteHeader />
	<HeroSection />

	<section class="flex w-full flex-col items-center py-[56px] max-[480px]:py-9">
		<div class="flex w-full max-w-[1280px] flex-col gap-[24px] px-[32px] max-[480px]:px-3.5">
			<div class="flex flex-wrap items-end justify-between gap-[16px]">
				<div class="flex flex-col gap-[4px]">
					<h2
						class="font-['Geist:Bold'] text-[30px] leading-[36px] font-bold text-[#0a0a0a] max-[480px]:text-2xl max-[480px]:leading-8"
					>
						Shop by category
					</h2>
					<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
						Browse the storefront catalog by department.
					</p>
				</div>
				<Button variant="outline" href="/categories">All categories</Button>
			</div>

			{#if home.loading && !home.data}
				<div class="grid w-full grid-cols-2 gap-[16px] sm:grid-cols-3 lg:grid-cols-4">
					{#each Array(8) as _, index (index)}
						<Card.Root class="gap-0 overflow-hidden">
							<Skeleton class="aspect-[4/3] w-full rounded-none" />
							<div class="flex flex-col gap-[8px] p-[16px]">
								<Skeleton class="h-[20px] w-3/4" />
								<Skeleton class="h-[20px] w-1/3" />
								<Skeleton class="h-[16px] w-1/2" />
							</div>
						</Card.Root>
					{/each}
				</div>
			{:else if rootCategories.length === 0}
				<p
					class="w-full rounded-[14px] bg-[#f5f5f5] px-[24px] py-[32px] text-center font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]"
				>
					No categories are available right now.
				</p>
			{:else}
				<div class="grid w-full grid-cols-2 gap-[16px] sm:grid-cols-3 lg:grid-cols-4">
					{#each rootCategories as category (category.id)}
						<Card.Root class="gap-0 overflow-hidden">
							<div class="relative aspect-[4/3] w-full overflow-hidden bg-[#f5f5f5]">
								{#if category.imageUrl}
									<img
										src={category.imageUrl}
										alt={category.name}
										loading="lazy"
										class="absolute inset-0 size-full object-cover"
									/>
								{:else}
									<ImagePlaceholder class="absolute inset-0" label={category.name} />
								{/if}
							</div>
							<Card.Header class="pt-[16px]">
								<Card.Title
									class="font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold text-[#0a0a0a]"
								>
									{category.name}
								</Card.Title>
								<div>
									<Badge variant="secondary">{category.productCount} products</Badge>
								</div>
							</Card.Header>
							<Card.Content class="pb-[16px]">
								<Button
									variant="link"
									size="sm"
									href={`/categories/${category.slug}`}
									class="h-auto px-0"
								>
									View category
									<ArrowRight />
								</Button>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</div>
	</section>

	<section class="flex w-full flex-col items-center pb-[72px]">
		<div
			class="flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-[16px] rounded-[14px] bg-[#f5f5f5] px-[24px] py-[20px]"
		>
			<p class="font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold text-[#0a0a0a]">
				Explore product listings
			</p>
			<div class="flex flex-wrap items-center gap-[12px]">
				<Button href="/products">Shop all products</Button>
				<Button variant="outline" href="/categories">Browse categories</Button>
			</div>
		</div>
	</section>

	<SiteFooter />
</div>

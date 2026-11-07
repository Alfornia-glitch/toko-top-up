<script lang="ts">
	import { onMount } from 'svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Card } from '#lib/frontend/components/ui/card/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';

	const fallbackCards = [
		{
			title: 'Fresh arrivals',
			subtitle: 'New season staples, just landed.',
			ctaLabel: 'Browse new',
			ctaUrl: '/products'
		},
		{
			title: 'Everyday essentials',
			subtitle: 'The pieces you reach for daily.',
			ctaLabel: 'Shop essentials',
			ctaUrl: '/products'
		}
	];

	const banners = $derived(home.banners.filter((item) => item.key === 'hero'));
	const main = $derived(banners[0]);
	const secondary = $derived(banners.slice(1, 3));
	const secondaryCards = $derived(
		fallbackCards.map((fallback, index) => {
			const banner = secondary[index];
			return {
				title: banner?.title ?? fallback.title,
				subtitle: banner?.subtitle ?? fallback.subtitle,
				ctaLabel: banner?.ctaLabel ?? fallback.ctaLabel,
				ctaUrl: banner?.ctaUrl ?? fallback.ctaUrl,
				imageUrl: banner?.imageUrl ?? null
			};
		})
	);

	onMount(() => {
		void home.ensure();
	});
</script>

<div class="flex min-h-screen w-full flex-col bg-white">
	<SiteHeader />
	<main class="flex-1">
		<section class="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-8">
			{#if home.loading && banners.length === 0}
				<div class="grid gap-4 sm:gap-6 lg:grid-cols-[1.4fr_1fr]">
					<Skeleton class="min-h-[420px] rounded-2xl sm:min-h-[520px]" />
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-col lg:gap-6">
						<Skeleton class="h-64 rounded-2xl lg:h-auto lg:flex-1" />
						<Skeleton class="h-64 rounded-2xl lg:h-auto lg:flex-1" />
					</div>
				</div>
			{:else}
				<div class="grid gap-4 sm:gap-6 lg:grid-cols-[1.4fr_1fr]">
					<Card
						class="flex min-h-[420px] flex-col justify-between gap-0 rounded-2xl bg-[#f5f5f5] p-6 ring-0 sm:min-h-[520px] sm:p-10"
					>
						<div class="flex flex-col items-start gap-4">
							<Badge variant="secondary" class="w-fit bg-white text-[#0a0a0a]">Editor's pick</Badge>
							<h1 class="text-3xl leading-tight font-bold text-[#0a0a0a] sm:text-5xl">
								{main?.title ?? 'The editorial edit'}
							</h1>
							<p class="max-w-md text-sm text-[#525252] sm:text-base">
								{main?.subtitle ?? 'A considered edit of the season’s most-wanted pieces.'}
							</p>
							<Button
								href={main?.ctaUrl ?? '/products'}
								class="w-fit bg-[#0a0a0a] text-white hover:bg-[#0a0a0a]/90"
							>
								{main?.ctaLabel ?? 'Shop the edit'}
							</Button>
						</div>
						<div class="relative mt-6 h-56 w-full sm:h-72">
							{#if main && main.imageUrl}
								<img
									src={main.imageUrl}
									alt={main.title}
									class="absolute inset-0 size-full object-contain"
								/>
							{:else}
								<ImagePlaceholder
									class="absolute inset-0 rounded-xl"
									label={main?.title ?? 'Featured banner'}
								/>
							{/if}
						</div>
					</Card>

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-col lg:gap-6">
						{#each secondaryCards as card, index (index)}
							<Card
								class="flex min-h-[220px] flex-1 flex-col justify-between gap-4 rounded-2xl bg-white p-6 ring-1 ring-[#e5e5e5]"
							>
								<div class="flex flex-col items-start gap-3">
									<h2 class="text-xl font-bold text-[#0a0a0a] sm:text-2xl">{card.title}</h2>
									<p class="text-sm text-[#525252]">{card.subtitle}</p>
									<Button href={card.ctaUrl} variant="outline" size="sm" class="w-fit bg-white">
										{card.ctaLabel}
									</Button>
								</div>
								<div class="relative h-40 w-full">
									{#if card.imageUrl}
										<img
											src={card.imageUrl}
											alt={card.title}
											class="absolute inset-0 size-full object-contain"
										/>
									{:else}
										<ImagePlaceholder class="absolute inset-0 rounded-xl" label={card.title} />
									{/if}
								</div>
							</Card>
						{/each}
					</div>
				</div>

				{#if home.categories.length > 0}
					<div class="mt-8 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:mt-10">
						{#each home.categories.slice(0, 8) as category (category.id)}
							<Button
								variant="outline"
								size="sm"
								href={`/categories/${category.slug}`}
								class="shrink-0"
							>
								{category.name}
							</Button>
						{/each}
					</div>
				{/if}
			{/if}
		</section>
	</main>
	<SiteFooter features={true} />
</div>

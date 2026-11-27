<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import * as Carousel from '#lib/frontend/components/ui/carousel/index.ts';
	import type { CarouselAPI } from '#lib/frontend/components/ui/carousel/context.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	const AUTOPLAY_MS = 5000;

	const banners = $derived(home.banners.filter((banner) => banner.key === 'hero'));

	let api = $state<CarouselAPI>();
	let selected = $state(0);
	let paused = $state(false);

	function setApi(next: CarouselAPI | undefined) {
		api = next;
	}

	$effect(() => {
		const current = api;
		if (!current) return;
		const onSelect = () => (selected = current.selectedScrollSnap());
		onSelect();
		current.on('select', onSelect);
		current.on('reInit', onSelect);
		return () => {
			current.off('select', onSelect);
			current.off('reInit', onSelect);
		};
	});

	onMount(() => {
		const timer = setInterval(() => {
			if (!paused && api) api.scrollNext();
		}, AUTOPLAY_MS);
		return () => clearInterval(timer);
	});
</script>

<section
	class="mx-auto mt-8 w-full px-8"
	data-name="Hero"
	aria-label={m.components_landing_hero_promo()}
	onmouseenter={() => (paused = true)}
	onmouseleave={() => (paused = false)}
	onfocusin={() => (paused = true)}
	onfocusout={() => (paused = false)}
>
	{#if banners.length === 0}
		{#if home.loading}
			<Skeleton class="aspect-[16/9] w-full rounded-2xl md:aspect-[21/9]" />
		{:else}
			<ImagePlaceholder
				class="aspect-[16/9] w-full rounded-2xl md:aspect-[21/9]"
				label={m.components_landing_hero_promo()}
			/>
		{/if}
	{:else}
		<Carousel.Root
			opts={{ loop: true }}
			{setApi}
			class="relative overflow-hidden rounded-2xl border"
		>
			<Carousel.Content class="ms-0">
				{#each banners as banner (banner.id)}
					<Carousel.Item class="ps-0">
						<div class="relative aspect-[16/9] w-full overflow-hidden bg-muted md:aspect-[21/9]">
							<picture>
								{#if banner.mobileImageUrl}
									<source media="(max-width: 767px)" srcset={banner.mobileImageUrl} />
								{/if}
								<img
									src={banner.imageUrl}
									alt={banner.title}
									draggable="false"
									class="absolute inset-0 size-full object-cover"
								/>
							</picture>
							<div
								class="absolute inset-0 flex flex-col justify-center gap-3 bg-gradient-to-r from-background/90 via-background/50 to-transparent p-6 md:p-12"
							>
								<Badge class="w-fit">{m.components_landing_hero_badge()}</Badge>
								<h2 class="max-w-xl text-2xl leading-tight font-bold italic md:text-5xl">
									{banner.title}
								</h2>
								{#if banner.subtitle}
									<p class="max-w-md text-sm text-muted-foreground">{banner.subtitle}</p>
								{/if}
								{#if banner.ctaLabel && banner.ctaUrl}
									<Button href={banner.ctaUrl} class="w-fit">{banner.ctaLabel}</Button>
								{/if}
							</div>
						</div>
					</Carousel.Item>
				{/each}
			</Carousel.Content>

			{#if banners.length > 1}
				<Carousel.Previous class="start-3 end-auto bg-background/70" />
				<Carousel.Next class="start-auto end-3 bg-background/70" />
				<div class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
					{#each banners as banner, index (banner.id)}
						<button
							type="button"
							aria-label={m.components_landing_hero_slide({ number: index + 1 })}
							aria-current={index === selected}
							onclick={() => api?.scrollTo(index)}
							class="size-2 rounded-full {index === selected ? 'bg-primary' : 'bg-foreground/30'}"
						></button>
					{/each}
				</div>
			{/if}
		</Carousel.Root>
	{/if}
</section>

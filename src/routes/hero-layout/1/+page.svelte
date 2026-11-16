<script lang="ts">
	import { onMount } from 'svelte';
	import { RotateCcw, ShieldCheck, Truck } from '@lucide/svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	const banner = $derived(home.banners.find((item) => item.key === 'hero'));
	const sideBanners = $derived(home.banners.filter((item) => item.key === 'hero').slice(1, 3));

	const features = [
		{
			icon: Truck,
			title: 'Free delivery',
			text: 'Complimentary shipping on orders over $50, delivered in 2 to 4 business days.'
		},
		{
			icon: ShieldCheck,
			title: 'Secure payment',
			text: 'Every checkout is encrypted and handled by trusted payment providers.'
		},
		{
			icon: RotateCcw,
			title: '30-day returns',
			text: 'Changed your mind? Send any item back within 30 days for a full refund.'
		}
	];

	onMount(() => {
		void home.ensure();
	});
</script>

<div class="flex min-h-screen w-full flex-col bg-white">
	<SiteHeader />

	<main class="flex-1">
		{#if home.loading && !banner}
			<section class="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-8 lg:py-16">
				<div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
					<div class="flex flex-col items-start gap-5">
						<Skeleton class="h-5 w-24" />
						<Skeleton class="h-12 w-full" />
						<Skeleton class="h-12 w-4/5" />
						<Skeleton class="h-5 w-full" />
						<Skeleton class="h-5 w-2/3" />
						<div class="flex flex-wrap gap-3 pt-2">
							<Skeleton class="h-9 w-32" />
							<Skeleton class="h-9 w-40" />
						</div>
					</div>
					<Skeleton class="aspect-[4/3] w-full rounded-2xl" />
				</div>
			</section>
		{:else}
			<section
				aria-labelledby="hero-heading"
				class="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-8 lg:py-16"
			>
				<div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
					<div class="flex flex-col items-start gap-5">
						<Badge>New season</Badge>
						<h1 id="hero-heading" class="text-4xl font-bold tracking-tight sm:text-5xl">
							{banner?.title ?? 'Everything you need, thoughtfully curated'}
						</h1>
						<p class="text-lg text-muted-foreground">
							{banner?.subtitle ??
								'Discover everyday essentials, standout design, and fair prices in one place.'}
						</p>
						<div class="flex flex-wrap gap-3 pt-2">
							<Button href={banner?.ctaUrl ?? '/products'}>Shop now</Button>
							<Button variant="outline" href="/categories">Browse categories</Button>
						</div>
					</div>
					<div class="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
						{#if banner?.imageUrl}
							<img src={banner.imageUrl} alt={banner.title} class="h-full w-full object-cover" />
						{:else}
							<ImagePlaceholder class="h-full w-full" label={banner?.title ?? 'Hero image'} />
						{/if}
					</div>
				</div>
			</section>

			<section
				aria-labelledby="features-heading"
				class="mx-auto w-full max-w-[1280px] px-4 pb-12 sm:px-8"
			>
				<h2 id="features-heading" class="sr-only">Why shop with us</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each features as feature (feature.title)}
						{@const Icon = feature.icon}
						<Card.Root>
							<Card.Header class="gap-3">
								<div
									class="flex size-10 items-center justify-center rounded-full bg-muted text-foreground"
								>
									<Icon class="size-5" aria-hidden="true" />
								</div>
								<Card.Title>{feature.title}</Card.Title>
							</Card.Header>
							<Card.Content>
								<Card.Description>{feature.text}</Card.Description>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</section>

			{#if sideBanners.length > 0}
				<section
					aria-labelledby="promotions-heading"
					class="mx-auto w-full max-w-[1280px] px-4 pb-16 sm:px-8"
				>
					<h2 id="promotions-heading" class="sr-only">Featured promotions</h2>
					<div class="grid gap-4 md:grid-cols-2">
						{#each sideBanners as item (item.id)}
							<Card.Root>
								<Card.Header class="gap-2">
									<Card.Title>{item.title}</Card.Title>
									{#if item.subtitle}
										<Card.Description>{item.subtitle}</Card.Description>
									{/if}
								</Card.Header>
								<Card.Content>
									<Button variant="link" href={item.ctaUrl ?? '/products'} class="h-auto px-0">
										{item.ctaLabel ?? 'Shop now'}
									</Button>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				</section>
			{/if}
		{/if}
	</main>

	<SiteFooter />
</div>

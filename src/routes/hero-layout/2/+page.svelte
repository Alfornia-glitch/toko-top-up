<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight, Headset, RotateCcw, ShieldCheck, Truck } from '@lucide/svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Card } from '#lib/frontend/components/ui/card/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';

	const banner = $derived(home.banners.find((item) => item.key === 'hero') ?? home.banners[0]);
	const categories = $derived(home.categories.slice(0, 6));

	const trustItems = [
		{ icon: Truck, label: 'Free shipping', detail: 'On orders over $50' },
		{ icon: ShieldCheck, label: 'Secure checkout', detail: 'Encrypted payments' },
		{ icon: RotateCcw, label: '30-day returns', detail: 'Hassle-free exchanges' },
		{ icon: Headset, label: '24/7 support', detail: 'Real people, anytime' }
	];

	onMount(() => {
		void home.ensure();
	});
</script>

<div class="flex min-h-screen w-full flex-col bg-white">
	<SiteHeader />

	{#if home.loading && !banner}
		<Skeleton class="h-[520px] w-full rounded-none" />
	{:else}
		<section
			class="relative min-h-[520px] w-full overflow-hidden sm:min-h-[600px] {banner?.imageUrl
				? ''
				: 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-700'}"
		>
			{#if banner?.imageUrl}
				<img
					class="absolute inset-0 size-full object-cover"
					src={banner.imageUrl}
					alt={banner.title}
				/>
				<div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10"></div>
			{/if}

			<div
				class="relative z-10 mx-auto flex min-h-[520px] w-full max-w-[1280px] items-center px-4 sm:min-h-[600px] sm:px-8"
			>
				<div class="flex max-w-2xl flex-col items-start gap-5">
					<Badge variant="secondary" class="border-white/20 bg-white/15 text-white">
						Featured collection
					</Badge>
					<h1 class="text-4xl font-bold text-white sm:text-6xl">
						{banner?.title ?? 'Everything you need, all in one place'}
					</h1>
					<p class="text-base text-white/80 sm:text-lg">
						{banner?.subtitle ??
							'Discover curated products, everyday essentials, and standout deals from Shopix.'}
					</p>
					<div class="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
						<Button
							href={banner?.ctaUrl ?? '/products'}
							class="bg-white text-black hover:bg-white/90"
						>
							{banner?.ctaLabel ?? 'Shop now'}
							<ArrowRight class="size-4" />
						</Button>
						<Button
							variant="outline"
							href="/categories"
							class="border-white/40 bg-transparent text-white hover:bg-white/10"
						>
							Browse categories
						</Button>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<section class="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-8 sm:py-10">
		<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			{#each trustItems as item (item.label)}
				{@const Icon = item.icon}
				<Card class="flex-row items-center gap-3 p-4">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100"
					>
						<Icon class="size-5" />
					</div>
					<div class="flex min-w-0 flex-col gap-0.5">
						<p class="text-sm font-semibold">{item.label}</p>
						<p class="text-xs text-muted-foreground">{item.detail}</p>
					</div>
				</Card>
			{/each}
		</div>
	</section>

	{#if categories.length > 0}
		<section class="mx-auto w-full max-w-[1280px] px-4 pb-12 sm:px-8">
			<div class="flex flex-col gap-4">
				<div class="flex items-end justify-between gap-4">
					<h2 class="text-2xl font-bold sm:text-3xl">Popular categories</h2>
					<a href="/categories" class="text-sm font-medium text-neutral-600 hover:text-black">
						View all
					</a>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each categories as category (category.id)}
						<Button variant="outline" size="sm" href={`/categories/${category.slug}`}>
							{category.name}
						</Button>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<SiteFooter />
</div>

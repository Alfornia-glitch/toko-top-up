<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { LoaderCircle, Minus, Plus, RotateCcw, Star, Truck } from '@lucide/svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import Seo from '#lib/frontend/components/Seo.svelte';
	import { productMeta } from '#lib/frontend/modules/seo/index.ts';
	import WishlistButton from '#lib/frontend/components/shared/WishlistButton.svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { cart } from '#lib/frontend/modules/commerce/cart.svelte.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import * as Tabs from '#lib/frontend/components/ui/tabs/index.ts';

	interface ProductImage {
		id: string;
		url: string;
		alt: string | null;
		position: number;
	}

	interface ProductOptionValue {
		value: string;
		colorHex: string | null;
	}

	interface ProductOption {
		id: string;
		name: string;
		values: ProductOptionValue[];
	}

	interface ProductVariant {
		id: string;
		sku: string;
		name: string;
		priceCents: number;
		compareAtPriceCents: number | null;
		stock: number;
		optionValuesJson: Record<string, string> | null;
	}

	interface ProductDetail {
		id: string;
		sku: string;
		name: string;
		slug: string;
		description: string | null;
		shortDescription: string | null;
		priceCents: number;
		compareAtPriceCents: number | null;
		currency: string;
		ratingAvg: number;
		ratingCount: number;
		soldCount: number;
		shippingInfo: string | null;
		returnPolicy: string | null;
		brandName: string | null;
		categoryName: string | null;
		images: ProductImage[];
		options: ProductOption[];
		variants: ProductVariant[];
	}

	let product = $state<ProductDetail | null>(null);
	let loading = $state(true);
	let notFound = $state(false);
	let error = $state('');
	let activeImage = $state(0);
	let quantity = $state(1);
	let selectedOptions = $state<Record<string, string>>({});

	const slug = $derived((page.params as { slug?: string }).slug);

	onMount(() => {
		void load(slug);
	});

	async function load(slug: string | undefined) {
		if (!slug) {
			notFound = true;
			loading = false;
			return;
		}

		loading = true;
		notFound = false;
		error = '';
		product = null;

		try {
			const response = await fetch(`/api/storefront/products/${encodeURIComponent(slug)}`);

			if (response.status === 404) {
				notFound = true;
				return;
			}

			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load product');

			const data = payload.data as ProductDetail;
			product = data;
			activeImage = 0;
			quantity = 1;
			selectedOptions = initialOptions(data);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load product';
		} finally {
			loading = false;
		}
	}

	function initialOptions(data: ProductDetail) {
		const initial: Record<string, string> = {};
		const firstVariant = data.variants[0];

		for (const option of data.options) {
			initial[option.name] =
				firstVariant?.optionValuesJson?.[option.name] ?? option.values[0]?.value ?? '';
		}

		return initial;
	}

	function formatMoney(cents: number, currency: string) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency || 'USD'
		}).format(cents / 100);
	}

	function ratingValue(value: number) {
		if (!Number.isFinite(value) || value <= 0) return 0;
		return Math.min(5, value > 5 ? value / 100 : value);
	}

	async function addToCart() {
		if (!selectedVariant || displayStock <= 0) return;
		await cart.add(selectedVariant.id, quantity);
	}

	const rating = $derived(product ? ratingValue(product.ratingAvg) : 0);
	const images = $derived(product?.images ?? []);
	const selectedVariant = $derived.by(() => {
		const current = product;
		if (!current) return null;

		return (
			current.variants.find((variant) => {
				const values = variant.optionValuesJson ?? {};
				return current.options.every(
					(option) =>
						(values[option.name] ?? option.values[0]?.value) === selectedOptions[option.name]
				);
			}) ?? null
		);
	});
	const displayPrice = $derived(selectedVariant?.priceCents ?? product?.priceCents ?? 0);
	const compareAt = $derived.by(() => {
		const value = selectedVariant?.compareAtPriceCents ?? product?.compareAtPriceCents ?? null;
		return value && value > displayPrice ? value : null;
	});
	const displayStock = $derived(selectedVariant?.stock ?? 0);
</script>

<div
	class="relative flex min-h-screen w-full flex-col items-center bg-white"
	data-name="Shopix - Product Detail"
>
	{#if product}
		<Seo meta={productMeta(product)} />
	{/if}
	<SiteHeader />
	<main class="mx-auto w-full max-w-[1280px] px-4 py-10 lg:px-8">
		{#if loading}
			<div class="grid gap-10 lg:grid-cols-2">
				<Skeleton class="aspect-square w-full rounded-[14px]" />
				<div class="flex flex-col gap-4">
					<Skeleton class="h-4 w-24" />
					<Skeleton class="h-8 w-3/4" />
					<Skeleton class="h-5 w-40" />
					<Skeleton class="h-10 w-32" />
					<Skeleton class="h-24 w-full" />
					<Skeleton class="h-9 w-full" />
					<Skeleton class="h-9 w-full" />
				</div>
			</div>
		{:else if notFound}
			<Card.Root class="mx-auto max-w-lg">
				<Card.Content class="flex flex-col items-center gap-4 py-12 text-center">
					<p class="text-lg font-semibold text-[#0a0a0a]">Product not found</p>
					<p class="text-sm text-[#737373]">
						The product you are looking for is unavailable or no longer listed.
					</p>
					<Button href="/products">Browse products</Button>
				</Card.Content>
			</Card.Root>
		{:else if error}
			<Card.Root class="mx-auto max-w-lg">
				<Card.Content class="flex flex-col items-center gap-4 py-12 text-center">
					<p class="text-sm text-destructive">{error}</p>
					<div class="flex flex-wrap justify-center gap-2">
						<Button variant="outline" href="/products">Back to products</Button>
						<Button onclick={() => void load(slug)}>Try again</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if product}
			<div class="grid gap-10 lg:grid-cols-2">
				<div class="flex flex-col gap-4">
					<div
						class="relative aspect-square overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-[#f5f5f5]"
					>
						{#if images[activeImage]}
							<img
								src={images[activeImage].url}
								alt={images[activeImage].alt ?? product.name}
								class="size-full object-cover"
							/>
						{:else}
							<ImagePlaceholder class="size-full" label={product.name} />
						{/if}
					</div>
					{#if images.length > 1}
						<div class="flex gap-3 overflow-x-auto pb-1">
							{#each images as image, index (image.id)}
								<button
									type="button"
									onclick={() => (activeImage = index)}
									aria-label={`View ${image.alt ?? product.name}`}
									class={`relative size-20 shrink-0 overflow-hidden rounded-[10px] border bg-[#f5f5f5] transition ${
										index === activeImage
											? 'border-[#0a0a0a] ring-2 ring-[#0a0a0a]/10'
											: 'border-[#e5e5e5] hover:border-[#a3a3a3]'
									}`}
								>
									<img src={image.url} alt="" class="size-full object-cover" loading="lazy" />
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<div class="flex flex-col gap-6">
					<div class="flex flex-col gap-3">
						<div class="flex flex-wrap items-center gap-2 text-xs text-[#737373]">
							{#if product.categoryName}
								<span>{product.categoryName}</span>
								<span aria-hidden="true">/</span>
							{/if}
							{#if product.brandName}
								<span class="font-medium text-[#0a0a0a]">{product.brandName}</span>
							{/if}
						</div>
						<h1 class="text-3xl leading-tight font-bold text-[#0a0a0a]">{product.name}</h1>
						<div class="flex flex-wrap items-center gap-2">
							<div class="flex items-center gap-0.5">
								{#each [0, 1, 2, 3, 4] as index (index)}
									<Star
										class={`size-4 ${
											index < Math.round(rating)
												? 'fill-[#d97706] text-[#d97706]'
												: 'text-[#d4d4d4]'
										}`}
									/>
								{/each}
							</div>
							<span class="text-sm text-[#737373]">
								{rating.toFixed(1)} ({product.ratingCount}) · {product.soldCount} sold
							</span>
						</div>
					</div>

					<div class="flex flex-wrap items-baseline gap-3">
						<span class="text-3xl font-bold text-[#0a0a0a]">
							{formatMoney(displayPrice, product.currency)}
						</span>
						{#if compareAt}
							<span class="text-lg text-[#737373] line-through">
								{formatMoney(compareAt, product.currency)}
							</span>
						{/if}
					</div>

					{#if product.shortDescription}
						<p class="text-sm leading-6 text-[#525252]">{product.shortDescription}</p>
					{/if}

					<Separator />

					{#if product.options.length > 0}
						<div class="flex flex-col gap-4">
							{#each product.options as option (option.id)}
								<div class="flex flex-col gap-2">
									<span class="text-sm font-medium text-[#0a0a0a]">{option.name}</span>
									<Select.Root type="single" bind:value={selectedOptions[option.name]}>
										<Select.Trigger class="w-full justify-between">
											<Select.Value placeholder={`Select ${option.name}`} />
										</Select.Trigger>
										<Select.Content>
											{#each option.values as value (value.value)}
												<Select.Item value={value.value} label={value.value}>
													{value.value}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							{/each}
						</div>
					{/if}

					<div class="flex flex-wrap items-center gap-3">
						{#if displayStock > 10}
							<Badge class="bg-[#16a34a]/10 text-[#16a34a]">In stock</Badge>
						{:else if displayStock > 0}
							<Badge class="bg-[#d97706]/10 text-[#b45309]">Only {displayStock} left</Badge>
						{:else}
							<Badge variant="destructive">Out of stock</Badge>
						{/if}
						{#if selectedVariant}
							<span class="text-xs text-[#737373]">SKU: {selectedVariant.sku}</span>
						{:else}
							<span class="text-xs text-[#737373]">SKU: {product.sku}</span>
						{/if}
					</div>

					<div class="flex flex-wrap items-center gap-3">
						<div class="flex items-center gap-2">
							<Button
								variant="outline"
								size="icon"
								aria-label="Decrease quantity"
								disabled={quantity <= 1}
								onclick={() => (quantity = Math.max(1, quantity - 1))}
							>
								<Minus />
							</Button>
							<Input
								type="number"
								min="1"
								max={Math.max(1, displayStock)}
								bind:value={quantity}
								class="w-16 text-center"
							/>
							<Button
								variant="outline"
								size="icon"
								aria-label="Increase quantity"
								disabled={displayStock <= 0 || quantity >= displayStock}
								onclick={() => (quantity = Math.min(Math.max(1, displayStock), quantity + 1))}
							>
								<Plus />
							</Button>
						</div>
						<Button
							size="lg"
							class="h-10 flex-1 px-6"
							disabled={displayStock <= 0}
							onclick={addToCart}
						>
							Add to cart
						</Button>
						<WishlistButton productId={product.id} label />
					</div>

					<div
						class="grid gap-3 rounded-[14px] border border-[#e5e5e5] bg-[#fafafa] p-4 text-sm text-[#525252]"
					>
						<div class="flex items-start gap-2">
							<Truck class="mt-0.5 size-4 shrink-0 text-[#0a0a0a]" />
							<span>{product.shippingInfo ?? 'Ships in 2–4 business days.'}</span>
						</div>
						<div class="flex items-start gap-2">
							<RotateCcw class="mt-0.5 size-4 shrink-0 text-[#0a0a0a]" />
							<span>{product.returnPolicy ?? '30-day returns.'}</span>
						</div>
					</div>

					<Tabs.Root value="description" class="w-full">
						<Tabs.List variant="line" class="w-full justify-start gap-6">
							<Tabs.Trigger value="description" class="flex-none">Description</Tabs.Trigger>
							<Tabs.Trigger value="shipping" class="flex-none">Shipping</Tabs.Trigger>
							<Tabs.Trigger value="returns" class="flex-none">Returns</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="description" class="pt-4 text-sm leading-6 text-[#525252]">
							{product.description ?? 'No description available for this product yet.'}
						</Tabs.Content>
						<Tabs.Content value="shipping" class="pt-4 text-sm leading-6 text-[#525252]">
							{product.shippingInfo ?? 'Ships in 2–4 business days.'}
						</Tabs.Content>
						<Tabs.Content value="returns" class="pt-4 text-sm leading-6 text-[#525252]">
							{product.returnPolicy ?? '30-day returns.'}
						</Tabs.Content>
					</Tabs.Root>
				</div>
			</div>
		{:else}
			<div class="flex h-64 items-center justify-center">
				<LoaderCircle class="size-6 animate-spin text-muted-foreground" />
			</div>
		{/if}
	</main>
	<SiteFooter />
</div>

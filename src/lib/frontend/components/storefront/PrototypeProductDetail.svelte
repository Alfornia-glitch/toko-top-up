<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		ChevronRight,
		Minus,
		Plus,
		RotateCcw,
		ShoppingCart,
		Star,
		ThumbsUp,
		TicketPercent,
		Truck
	} from '@lucide/svelte';
	import StorefrontProductCard from '#lib/frontend/components/storefront/StorefrontProductCard.svelte';
	import WishlistButton from '#lib/frontend/components/shared/WishlistButton.svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { cart } from '#lib/frontend/modules/commerce/cart.svelte.ts';
	import {
		discountPercent,
		formatDateTime,
		formatMoney,
		ratingValue
	} from '#lib/frontend/modules/commerce/format.ts';
	import { getProduct } from '#lib/frontend/modules/commerce/products.ts';
	import type { ProductDetail, ProductVariant } from '#lib/frontend/modules/commerce/models.ts';

	let { slug }: { slug: string } = $props();

	let product = $state<ProductDetail | null>(null);
	let loading = $state(true);
	let notFound = $state(false);
	let error = $state('');
	let activeImage = $state(0);
	let quantity = $state(1);
	let selectedOptions = $state<Record<string, string>>({});
	let notice = $state('');
	let noticeType = $state<'success' | 'error'>('success');
	let adding = $state(false);

	onMount(() => {
		void load(slug);
	});

	function isNotFound(cause: unknown): boolean {
		return (
			typeof cause === 'object' &&
			cause !== null &&
			'status' in cause &&
			(cause as { status?: unknown }).status === 404
		);
	}

	async function load(value: string) {
		loading = true;
		notFound = false;
		error = '';
		product = null;
		notice = '';

		try {
			const data = await getProduct(value);
			product = data;
			activeImage = 0;
			quantity = 1;
			selectedOptions = initialOptions(data);
		} catch (cause) {
			if (isNotFound(cause)) {
				notFound = true;
			} else {
				error = cause instanceof Error ? cause.message : 'Could not load product';
			}
		} finally {
			loading = false;
		}
	}

	function initialOptions(data: ProductDetail): Record<string, string> {
		const initial: Record<string, string> = {};
		const firstVariant = data.variants[0];

		for (const option of data.options) {
			initial[option.name] =
				firstVariant?.optionValuesJson?.[option.name] ?? option.values[0]?.value ?? '';
		}

		return initial;
	}

	function selectOption(name: string, value: string) {
		selectedOptions = { ...selectedOptions, [name]: value };
		quantity = 1;
		notice = '';
	}

	function decrement() {
		quantity = Math.max(1, quantity - 1);
	}

	function increment() {
		quantity = Math.min(Math.max(1, displayStock), quantity + 1);
	}

	async function addToCart(redirect: boolean) {
		const variant = selectedVariant;
		if (!variant || displayStock <= 0) return;

		adding = true;
		notice = '';

		try {
			await cart.add(variant.id, quantity);

			if (cart.error) {
				noticeType = 'error';
				notice = cart.error;
				return;
			}

			noticeType = 'success';
			notice = 'Added to cart';

			if (redirect) await goto('/checkout/address');
		} catch (cause) {
			noticeType = 'error';
			notice = cause instanceof Error ? cause.message : 'Could not add to cart';
		} finally {
			adding = false;
		}
	}

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

	const displayPrice = $derived(selectedVariant?.price ?? product?.price ?? 0);
	const compareAt = $derived.by(() => {
		const value = selectedVariant?.compareAtPrice ?? product?.compareAtPrice ?? null;
		return value && value > displayPrice ? value : null;
	});
	const displayStock = $derived(selectedVariant?.stock ?? product?.stock ?? 0);
	const discount = $derived(discountPercent(displayPrice, compareAt));
	const rating = $derived(product ? ratingValue(product.ratingAvg) : 0);

	const bucketRows = $derived.by(() => {
		const current = product;
		if (!current) return [] as { stars: number; count: number; percent: number }[];

		const buckets = current.ratingBuckets;
		const total = (['1', '2', '3', '4', '5'] as const).reduce(
			(sum, key) => sum + (buckets[key] ?? 0),
			0
		);

		return ([5, 4, 3, 2, 1] as const).map((stars) => {
			const count = buckets[String(stars) as keyof typeof buckets] ?? 0;
			return {
				stars,
				count,
				percent: total > 0 ? Math.round((count / total) * 100) : 0
			};
		});
	});
</script>

<div class="relative flex w-full flex-col items-center bg-white" data-name="Product detail">
	<div
		class="relative flex w-full max-w-[1440px] flex-col items-center justify-center gap-[14px] bg-white py-[56px]"
		data-name="Product overview"
	>
		<div class="relative flex w-full max-w-[1280px] items-center px-[32px]" data-name="Breadcrumbs">
			<nav
				aria-label="Breadcrumb"
				class="relative flex max-h-[28px] flex-wrap items-center gap-[6px] text-[14px] leading-[20px] text-[#737373]"
				data-name="Items"
			>
				<a href="/" class="shrink-0 transition hover:text-[#0a0a0a]">Home</a>
				<ChevronRight class="size-[14px] shrink-0" aria-hidden="true" />
				<a href="/products" class="shrink-0 transition hover:text-[#0a0a0a]">Products</a>
				<ChevronRight class="size-[14px] shrink-0" aria-hidden="true" />
				<span class="shrink-0 font-medium text-[#0a0a0a]" aria-current="page">
					{product?.name ?? slug}
				</span>
			</nav>
		</div>

		{#if loading}
			<div class="flex w-full max-w-[1280px] flex-col gap-[32px] px-[32px] lg:flex-row">
				<div class="flex w-full flex-col gap-[14px] lg:flex-1">
					<Skeleton class="aspect-square w-full rounded-[8px]" />
					<div class="flex gap-[14px]">
						{#each [0, 1, 2, 3] as item (item)}
							<Skeleton class="aspect-[122/124] flex-1 rounded-[8px]" />
						{/each}
					</div>
				</div>
				<div class="flex w-full flex-col gap-[16px] lg:flex-1">
					<Skeleton class="h-[26px] w-[88px] rounded-full" />
					<Skeleton class="h-[36px] w-3/4" />
					<Skeleton class="h-[20px] w-40" />
					<Skeleton class="h-[32px] w-32" />
					<Skeleton class="h-[24px] w-full" />
					<Skeleton class="h-[72px] w-full rounded-[8px]" />
					<Skeleton class="h-[44px] w-full rounded-[8px]" />
					<Skeleton class="h-[44px] w-full rounded-[8px]" />
				</div>
			</div>
		{:else if notFound}
			<div class="flex w-full max-w-[1280px] justify-center px-[32px]">
				<Card.Root class="mx-auto w-full max-w-lg">
					<Card.Content class="flex flex-col items-center gap-[16px] py-[48px] text-center">
						<p class="text-[18px] font-semibold text-[#0a0a0a]">Product not found</p>
						<p class="text-[14px] text-[#737373]">
							The product you are looking for is unavailable or no longer listed.
						</p>
						<Button href="/products">Browse products</Button>
					</Card.Content>
				</Card.Root>
			</div>
		{:else if error}
			<div class="flex w-full max-w-[1280px] justify-center px-[32px]">
				<Card.Root class="mx-auto w-full max-w-lg">
					<Card.Content class="flex flex-col items-center gap-[16px] py-[48px] text-center">
						<p class="text-[14px] text-[#dc2626]">{error}</p>
						<Button href="/products">Browse products</Button>
					</Card.Content>
				</Card.Root>
			</div>
		{:else if product}
			<div
				class="relative flex w-full max-w-[1280px] min-w-[328px] flex-col items-start justify-center gap-[32px] px-[32px] lg:flex-row"
				data-node-id="I1:21686;31919:11168"
				data-name="Flex Horizontal"
			>
				<div
					class="relative flex w-full flex-col items-start justify-center gap-[14px] lg:h-[720px] lg:flex-1"
					data-node-id="I1:21686;31919:11169"
					data-name="Flex Vertical"
				>
					<div
						class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[8px] bg-[#f5f5f5]"
						data-name="Product image"
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
						<div
							class="relative flex w-full items-start gap-[14px] overflow-x-auto pb-1"
							data-name="Gallery thumbnails"
						>
							{#each images as image, index (image.id)}
								<button
									type="button"
									onclick={() => (activeImage = index)}
									aria-label={`View image ${index + 1}`}
									aria-pressed={index === activeImage}
									class={`relative aspect-[122/124] min-w-20 flex-1 overflow-hidden rounded-[8px] border bg-[#f5f5f5] transition ${
										index === activeImage
											? 'border-[#171717]'
											: 'border-[#e5e5e5] hover:border-[#a3a3a3]'
									}`}
								>
									<img src={image.url} alt="" class="size-full object-cover" loading="lazy" />
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<div
					class="relative flex w-full flex-col items-start justify-center gap-[24px] lg:flex-1"
					data-name="Product info"
				>
					<div class="flex w-full flex-col items-start gap-[28px]">
						<div class="flex w-full flex-col items-start gap-[14px]">
							<div class="flex w-full flex-wrap items-center justify-between gap-[12px]">
								<Badge
									class={displayStock > 0
										? 'h-[26px] rounded-full bg-[#16a34a]/10 px-[12px] py-[4px] text-[12px] font-medium text-[#16a34a]'
										: 'h-[26px] rounded-full bg-[#dc2626]/10 px-[12px] py-[4px] text-[12px] font-medium text-[#dc2626]'}
								>
									{displayStock > 0 ? 'In Stock' : 'Out of stock'}
								</Badge>
							</div>

							<div class="flex w-full flex-col items-start gap-[6px]">
								<h1 class="text-[30px] leading-[36px] font-semibold text-[#0a0a0a]">
									{product.name}
								</h1>
								<div class="flex w-full flex-wrap items-center gap-[6px]">
									<div
										class="flex items-center gap-0.5"
										aria-label={`Rated ${rating.toFixed(1)} out of 5`}
									>
										{#each [0, 1, 2, 3, 4] as index (index)}
											<Star
												class={`size-[16px] ${
													index < Math.round(rating)
														? 'fill-[#d97706] text-[#d97706]'
														: 'text-[#d4d4d4]'
												}`}
											/>
										{/each}
									</div>
									<span class="text-[14px] leading-[20px] font-medium text-[#737373]">
										({product.ratingCount} Reviews)
									</span>
								</div>
							</div>

							<div class="flex w-full flex-wrap items-center gap-[4px]" data-name="Price">
								<span class="text-[24px] leading-[32px] font-semibold text-[#0a0a0a]">
									{formatMoney(displayPrice, product.currency)}
								</span>
								{#if compareAt}
									<span class="text-[20px] leading-[28px] font-normal text-[#737373] line-through">
										{formatMoney(compareAt, product.currency)}
									</span>
									{#if discount > 0}
										<Badge
											class="h-[22px] rounded-full bg-[#16a34a]/10 px-[8px] text-[12px] font-medium text-[#16a34a]"
										>
											{discount}% OFF
										</Badge>
									{/if}
								{/if}
							</div>
						</div>

						{#if product.shortDescription}
							<p class="w-full text-[18px] leading-[28px] text-[#737373]">
								{product.shortDescription}
							</p>
						{:else if product.description}
							<p class="w-full text-[18px] leading-[28px] text-[#737373]">{product.description}</p>
						{/if}
					</div>

					<div
						class="flex w-full flex-col items-start gap-[10px] rounded-[8px] border border-[#e5e5e5] bg-[#f5f5f5] p-[10px]"
						data-name="Offers"
					>
						<div class="flex w-full flex-wrap items-center justify-between gap-[8px]">
							<div class="flex items-center gap-[4px]">
								<TicketPercent class="size-[20px] text-[#0a0a0a]" />
								<p class="text-[14px] leading-[20px] font-semibold text-[#0a0a0a]">
									Offers and savings
								</p>
							</div>
							<a
								href="/cart"
								class="text-[12px] leading-[16px] font-medium text-[#16a34a] transition hover:underline"
							>
								Apply a coupon at checkout
							</a>
						</div>
					</div>

					{#if product.options.length > 0}
						<div class="flex w-full flex-col items-start gap-[16px]" data-name="Product options">
							{#each product.options as option (option.id)}
								{@const isColor = option.values.some((value) => value.colorHex)}
								<div class="flex w-full flex-col items-start gap-[10px]">
									<p class="text-[18px] leading-[28px] font-medium text-[#0a0a0a]">
										{option.name}:
										<span class="text-[#737373]">{selectedOptions[option.name] ?? ''}</span>
									</p>
									<div class="flex w-full flex-wrap items-center gap-[12px]">
										{#each option.values as value (value.value)}
											{#if isColor && value.colorHex}
												<button
													type="button"
													onclick={() => selectOption(option.name, value.value)}
													aria-label={value.value}
													aria-pressed={selectedOptions[option.name] === value.value}
													class={`flex size-[44px] items-center justify-center rounded-full border-2 transition ${
														selectedOptions[option.name] === value.value
															? 'border-[#171717]'
															: 'border-transparent hover:border-[#a3a3a3]'
													}`}
												>
													<span
														class="block size-[32px] rounded-full border border-[#e5e5e5]"
														style={`background-color: ${value.colorHex}`}
													></span>
												</button>
											{:else}
												<button
													type="button"
													onclick={() => selectOption(option.name, value.value)}
													aria-pressed={selectedOptions[option.name] === value.value}
													class={`flex min-w-[40px] items-center justify-center rounded-[8px] border px-[10px] py-[4px] text-[14px] leading-[20px] font-medium transition ${
														selectedOptions[option.name] === value.value
															? 'border-[#171717] bg-[#171717] text-[#fafafa]'
															: 'border-[#e5e5e5] bg-white text-[#0a0a0a] hover:border-[#a3a3a3]'
													}`}
												>
													{value.value}
												</button>
											{/if}
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<div class="flex w-full flex-col items-start gap-[16px]" data-name="Quantity actions">
						<div class="flex w-full flex-wrap items-center gap-[16px]">
							<div
								class="flex h-[36px] w-[128px] shrink-0 items-center gap-[6px] overflow-clip rounded-[8px] border border-[#e5e5e5] bg-white px-[12px] py-[8px]"
								data-name="Input Number"
							>
								<button
									type="button"
									aria-label="Decrease quantity"
									disabled={quantity <= 1 || displayStock <= 0}
									onclick={decrement}
									class="flex size-[20px] shrink-0 items-center justify-center rounded-[4px] bg-[#f5f5f5] p-[4px] transition disabled:opacity-40"
								>
									<Minus class="size-[12px]" />
								</button>
								<span class="flex-1 text-center text-[14px] leading-[20px] text-[#0a0a0a]">
									{quantity}
								</span>
								<button
									type="button"
									aria-label="Increase quantity"
									disabled={displayStock <= 0 || quantity >= displayStock}
									onclick={increment}
									class="flex size-[20px] shrink-0 items-center justify-center rounded-[4px] bg-[#f5f5f5] p-[4px] transition disabled:opacity-40"
								>
									<Plus class="size-[12px]" />
								</button>
							</div>
							<Button
								type="button"
								data-name="Solid Button"
								class="h-[36px] min-w-[140px] flex-1 rounded-[10px] bg-[#171717] px-[16px] text-[14px] font-medium text-[#fafafa] hover:bg-[#262626]"
								disabled={adding || !selectedVariant || displayStock <= 0}
								onclick={() => void addToCart(false)}
							>
								<ShoppingCart class="size-[16px]" />
								Add to Cart
							</Button>
							<Button
								type="button"
								variant="outline"
								data-name="Outline Button"
								class="h-[36px] min-w-[140px] flex-1 rounded-[10px] border-[#e5e5e5] bg-white px-[16px] text-[14px] font-medium text-[#0a0a0a] hover:bg-[#f5f5f5]"
								disabled={adding || !selectedVariant || displayStock <= 0}
								onclick={() => void addToCart(true)}
							>
								Buy Now
							</Button>
							<WishlistButton productId={product.id} label class="h-[36px] rounded-[10px]" />
						</div>
						{#if notice}
							<p
								class={`text-[14px] leading-[20px] ${
									noticeType === 'error' ? 'text-[#dc2626]' : 'text-[#16a34a]'
								}`}
								role="status"
							>
								{notice}
							</p>
						{/if}
					</div>

					{#if product.shippingInfo || product.returnPolicy}
						<div
							class="relative flex w-full flex-col items-start overflow-clip rounded-[14px] bg-white py-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
							data-name="Card"
						>
							<div class="flex w-full flex-col items-start gap-[16px] px-[16px]">
								{#if product.shippingInfo}
									<div class="flex w-full items-start gap-[16px]">
										<Truck class="mt-0.5 size-[24px] shrink-0 text-[#0a0a0a]" />
										<div class="flex flex-col items-start gap-[4px]">
											<p class="text-[16px] leading-[24px] font-medium text-[#0a0a0a]">Shipping</p>
											<p class="text-[14px] leading-[22px] text-[#737373]">
												{product.shippingInfo}
											</p>
										</div>
									</div>
								{/if}
								{#if product.returnPolicy}
									<div class="flex w-full items-start gap-[16px]">
										<RotateCcw class="mt-0.5 size-[24px] shrink-0 text-[#0a0a0a]" />
										<div class="flex flex-col items-start gap-[4px]">
											<p class="text-[16px] leading-[24px] font-medium text-[#0a0a0a]">
												Return or Exchange
											</p>
											<p class="text-[14px] leading-[22px] text-[#737373]">
												{product.returnPolicy}
											</p>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	{#if product && !loading}
		{#if product.description}
			<div
				class="relative flex w-full flex-col items-center justify-center bg-white py-[56px]"
				data-name="Data table"
			>
				<div
					class="flex w-full max-w-[1280px] flex-col items-start gap-[24px] px-[32px]"
					data-name="Flex Vertical"
				>
					<h2 class="text-[24px] leading-[32px] font-semibold text-[#0a0a0a]">Key Highlights</h2>
					<p class="max-w-[960px] text-[16px] leading-[28px] whitespace-pre-line text-[#737373]">
						{product.description}
					</p>
				</div>
			</div>
		{/if}

		<div
			class="relative flex w-full flex-col items-center justify-center py-[56px]"
			data-name="Product reviews"
		>
			<div
				class="flex w-full max-w-[1280px] flex-col items-center gap-[24px] px-[32px]"
				data-name="Flex Vertical"
			>
				<h2 class="w-full text-[24px] leading-[32px] font-semibold text-[#0a0a0a]">Reviews</h2>
				<div class="flex w-full flex-col items-start gap-[48px] lg:flex-row">
					<div
						class="flex w-full max-w-[361px] shrink-0 flex-col items-start gap-[16px] overflow-clip rounded-[14px] bg-[#f5f5f5] py-[24px]"
						data-name="Card"
					>
						<div class="flex w-full flex-col items-start gap-[24px] px-[24px]">
							<div class="flex w-full flex-col items-center justify-center gap-[8px]">
								<p class="text-[60px] leading-none font-semibold text-[#0a0a0a]">
									{rating.toFixed(1)}<span class="text-[36px] leading-[40px]">/5</span>
								</p>
								<div
									class="flex items-center gap-0.5"
									aria-label={`Rated ${rating.toFixed(1)} out of 5`}
								>
									{#each [0, 1, 2, 3, 4] as index (index)}
										<Star
											class={`size-[24px] ${
												index < Math.round(rating)
													? 'fill-[#d97706] text-[#d97706]'
													: 'text-[#d4d4d4]'
											}`}
										/>
									{/each}
								</div>
								<p class="text-[16px] leading-[24px] font-medium text-[#0a0a0a]">
									Based on {product.ratingCount} verified reviews
								</p>
							</div>
							<div class="flex w-full flex-col items-start gap-[10px]">
								{#each bucketRows as bucket (bucket.stars)}
									<div class="flex w-full items-center gap-[12px]">
										<div class="flex shrink-0 items-center gap-[2px]">
											<span class="text-[14px] leading-[20px] font-semibold text-[#0a0a0a]">
												{bucket.stars}
											</span>
											<Star class="size-[12px] fill-[#d97706] text-[#d97706]" />
										</div>
										<div class="h-[10px] flex-1 overflow-hidden rounded-full bg-[#e5e5e5]">
											<div
												class="h-full rounded-full bg-[#d97706]"
												style={`width: ${bucket.percent}%`}
											></div>
										</div>
										<span class="w-[32px] shrink-0 text-right text-[12px] text-[#737373]">
											{bucket.count}
										</span>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<div class="flex w-full flex-col items-start gap-[16px]">
						{#if product.reviews.length === 0}
							<p
								class="w-full rounded-[14px] border border-[#e5e5e5] bg-white p-[24px] text-[14px] text-[#737373]"
							>
								No reviews yet.
							</p>
						{:else}
							{#each product.reviews as review (review.id)}
								<article
									class="flex w-full flex-col items-start gap-[8px] rounded-[14px] border border-[#e5e5e5] bg-white p-[16px]"
									data-name="Review"
								>
									<div class="flex w-full flex-wrap items-center justify-between gap-[8px]">
										<div class="flex flex-wrap items-center gap-[10px]">
											<span class="text-[14px] leading-[20px] font-semibold text-[#0a0a0a]">
												{review.customerName ?? 'Verified buyer'}
											</span>
											<span class="text-[12px] leading-[16px] text-[#737373]">
												{formatDateTime(review.createdAt)}
											</span>
										</div>
										<div class="flex items-center gap-0.5" aria-label={`${review.rating} out of 5`}>
											{#each [0, 1, 2, 3, 4] as index (index)}
												<Star
													class={`size-[14px] ${
														index < review.rating
															? 'fill-[#d97706] text-[#d97706]'
															: 'text-[#d4d4d4]'
													}`}
												/>
											{/each}
										</div>
									</div>
									{#if review.title}
										<p class="text-[16px] leading-[24px] font-medium text-[#0a0a0a]">
											{review.title}
										</p>
									{/if}
									{#if review.body}
										<p class="text-[14px] leading-[22px] text-[#525252]">{review.body}</p>
									{/if}
									<div class="flex items-center gap-[6px] text-[12px] text-[#737373]">
										<ThumbsUp class="size-[14px]" />
										<span>{review.helpfulCount} found this helpful</span>
									</div>
								</article>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		</div>

		{#if product.related.length > 0}
			<div
				class="relative flex w-full flex-col items-center justify-center bg-white py-[56px]"
				data-name="Product list"
			>
				<div
					class="flex w-full max-w-[1280px] flex-col items-start gap-[24px] px-[32px]"
					data-name="Flex Vertical"
				>
					<h2 class="text-[24px] leading-[32px] font-semibold text-[#0a0a0a]">Related products</h2>
					<div class="grid w-full grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-4">
						{#each product.related as related (related.id)}
							<StorefrontProductCard product={related} />
						{/each}
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

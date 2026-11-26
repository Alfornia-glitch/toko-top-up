<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ArrowRight, Minus, Plus, ShoppingCart, Tag, Trash2 } from '@lucide/svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';
	import CheckoutSteps from '#lib/frontend/modules/commerce/components/CheckoutSteps.svelte';
	import { cart } from '#lib/frontend/modules/commerce/cart.svelte.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';

	let couponCode = $state('');
	let couponError = $state('');

	onMount(() => {
		void cart.refresh();
		void site.ensure();
	});

	const isTopup = $derived(site.storefrontLayout === 'topup');
	const nextStep = $derived(isTopup ? '/checkout/account' : '/checkout/address');

	const discountAmount = $derived(cart.discount > 0 ? -cart.discount : 0);
	const shipping = $derived(cart.cart?.shipping ?? 0);
	const shippingLabel = $derived(
		shipping > 0
			? formatMoney(shipping, cart.currency)
			: isTopup
				? formatMoney(0, cart.currency)
				: m.cart_calculated_at_checkout()
	);

	async function applyCoupon() {
		const code = couponCode.trim();

		if (!code) {
			couponError = m.cart_coupon_required();
			return;
		}

		couponError = '';
		await cart.applyCoupon(code);

		if (cart.error) {
			couponError = cart.error;
		} else {
			couponCode = '';
		}
	}
</script>

<div
	class="relative flex size-full flex-col content-stretch items-center bg-background"
	data-name="Shopix - Cart"
>
	<SiteHeader />
	<div class="flex w-full flex-col items-center bg-white py-10 sm:py-14">
		<main class="mx-auto w-full max-w-[1280px] px-4 sm:px-8">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
					{m.cart_title()}
				</h1>
				<p class="text-sm text-muted-foreground" aria-live="polite">
					{m.cart_items_in_cart({ count: cart.count })}
				</p>
			</div>

			<CheckoutSteps current="cart" />

			{#if cart.loading && !cart.cart}
				<div
					class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start"
					aria-busy="true"
					aria-live="polite"
				>
					<div class="flex flex-col gap-4">
						<Skeleton class="h-11 w-full rounded-lg" />
						<Skeleton class="h-40 w-full rounded-xl" />
						<Skeleton class="h-40 w-full rounded-xl" />
					</div>
					<Skeleton class="h-96 w-full rounded-xl" />
				</div>
			{:else}
				{#if cart.error}
					<div
						class="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
						role="alert"
					>
						{cart.error}
					</div>
				{/if}

				<div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
					<div class="flex min-w-0 flex-col gap-4">
						<Button
							variant="outline"
							href="/products"
							class="h-11 w-full justify-between px-4 text-sm"
						>
							<span class="font-medium">{m.cart_add_more()}</span>
							<ArrowRight class="size-4" />
						</Button>

						{#if cart.items.length === 0}
							<Card.Root>
								<Card.Content class="flex flex-col items-center gap-4 py-12 text-center">
									<div class="flex size-14 items-center justify-center rounded-full bg-muted">
										<ShoppingCart class="size-7 text-muted-foreground" />
									</div>
									<div class="flex flex-col gap-1">
										<Card.Title class="text-lg">{m.cart_empty_title()}</Card.Title>
										<Card.Description>
											{m.cart_empty_description()}
										</Card.Description>
									</div>
									<div class="flex flex-wrap items-center justify-center gap-2">
										<Button href="/products">{m.common_browse_products()}</Button>
										<Button variant="outline" href="/cart/empty">{m.cart_view_empty()}</Button>
									</div>
								</Card.Content>
							</Card.Root>
						{:else}
							<div class="flex flex-col gap-4">
								{#each cart.items as item (item.id)}
									<Card.Root>
										<Card.Content class="flex gap-4 sm:gap-5">
											<div
												class="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-32 sm:w-32"
											>
												{#if item.imageUrl}
													<img
														src={item.imageUrl}
														alt={item.productName}
														loading="lazy"
														class="size-full object-contain p-1.5"
													/>
												{:else}
													<ImagePlaceholder class="size-full" label={item.productName} />
												{/if}
											</div>

											<div class="flex min-w-0 flex-1 flex-col gap-2">
												<div class="flex items-start justify-between gap-3">
													<div class="flex min-w-0 flex-col gap-0.5">
														{#if item.brandName}
															<span
																class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
															>
																{item.brandName}
															</span>
														{/if}
														<p class="truncate text-sm font-semibold text-foreground sm:text-base">
															{item.productName}
														</p>
														<p class="truncate text-xs text-muted-foreground">
															{item.variantName}
														</p>
													</div>
													<Button
														variant="ghost"
														size="icon-sm"
														class="text-muted-foreground hover:text-destructive"
														aria-label={m.cart_remove_item({ name: item.productName })}
														onclick={() => void cart.remove(item.id)}
														disabled={cart.loading}
													>
														<Trash2 class="size-4" />
													</Button>
												</div>

												<div class="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
													<div class="flex flex-col">
														<span class="text-sm font-semibold text-foreground sm:text-base">
															{formatMoney(item.unitPrice, cart.currency)}
														</span>
														{#if item.compareAtPrice && item.compareAtPrice > item.unitPrice}
															<span class="text-xs text-muted-foreground line-through">
																{formatMoney(item.compareAtPrice, cart.currency)}
															</span>
														{/if}
													</div>

													<div class="flex flex-wrap items-center gap-3">
														<div class="flex items-center rounded-lg border bg-background">
															<Button
																variant="ghost"
																size="icon-sm"
																class="rounded-r-none"
																aria-label={m.cart_decrease_item({ name: item.productName })}
																onclick={() => void cart.update(item.id, item.quantity - 1)}
																disabled={cart.loading || item.quantity <= 1}
															>
																<Minus class="size-3.5" />
															</Button>
															<span
																class="min-w-8 text-center text-sm font-medium text-foreground"
																aria-live="polite"
															>
																{item.quantity}
															</span>
															<Button
																variant="ghost"
																size="icon-sm"
																class="rounded-l-none"
																aria-label={m.cart_increase_item({ name: item.productName })}
																onclick={() => void cart.update(item.id, item.quantity + 1)}
																disabled={cart.loading || item.quantity >= item.stock}
															>
																<Plus class="size-3.5" />
															</Button>
														</div>

														<div class="flex flex-col items-end">
															<span
																class="text-[11px] tracking-wide text-muted-foreground uppercase"
															>
																{m.cart_line_total()}
															</span>
															<span class="text-sm font-semibold text-foreground">
																{formatMoney(item.unitPrice * item.quantity, cart.currency)}
															</span>
														</div>
													</div>
												</div>
											</div>
										</Card.Content>
									</Card.Root>
								{/each}
							</div>
						{/if}
					</div>

					<Card.Root class="lg:sticky lg:top-24">
						<Card.Header>
							<Card.Title>{m.cart_order_summary()}</Card.Title>
							{#if cart.loading}
								<Card.Description class="flex items-center gap-1.5">
									<Spinner class="size-3" />
									{m.cart_updating()}
								</Card.Description>
							{:else}
								<Card.Description>
									{m.cart_items_in_cart({ count: cart.count })}
								</Card.Description>
							{/if}
						</Card.Header>

						<Card.Content class="flex flex-col gap-4">
							<div class="rounded-lg border bg-muted/40 p-3">
								<div class="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
									<Tag class="size-4 text-muted-foreground" />
									{m.cart_coupon()}
								</div>

								{#if cart.cart?.coupon}
									<div class="flex items-center justify-between gap-2">
										<Badge variant="secondary" class="font-mono">
											{cart.cart?.coupon?.code}
										</Badge>
										<Button
											variant="ghost"
											size="sm"
											class="text-muted-foreground hover:text-foreground"
											onclick={() => void cart.removeCoupon()}
											disabled={cart.loading}
										>
											{m.common_remove()}
										</Button>
									</div>
								{:else}
									<form
										class="flex items-center gap-2"
										onsubmit={(event) => {
											event.preventDefault();
											void applyCoupon();
										}}
									>
										<Input
											bind:value={couponCode}
											placeholder={m.cart_coupon_placeholder()}
											aria-label={m.cart_coupon()}
											autocomplete="off"
											class="h-9 bg-background"
											disabled={cart.loading}
											oninput={() => (couponError = '')}
										/>
										<Button
											type="submit"
											size="sm"
											class="h-9 shrink-0 px-4"
											disabled={cart.loading || couponCode.trim().length === 0}
										>
											{m.common_apply()}
										</Button>
									</form>
								{/if}

								{#if couponError}
									<p class="mt-2 text-xs text-destructive" role="alert">{couponError}</p>
								{/if}
							</div>

							<dl class="flex flex-col gap-2.5 text-sm">
								<div class="flex items-start justify-between gap-4">
									<dt class="text-muted-foreground">{m.common_subtotal()}</dt>
									<dd class="font-medium text-foreground">
										{formatMoney(cart.subtotal, cart.currency)}
									</dd>
								</div>
								<div class="flex items-start justify-between gap-4">
									<dt class="text-muted-foreground">{m.cart_subtotal_shipping()}</dt>
									<dd class="text-right font-medium text-foreground">{shippingLabel}</dd>
								</div>
								<div class="flex items-start justify-between gap-4">
									<dt class="text-muted-foreground">{m.cart_discount()}</dt>
									<dd class="font-medium text-foreground">
										{formatMoney(discountAmount, cart.currency)}
									</dd>
								</div>
							</dl>

							<Separator />

							<div
								class="flex items-start justify-between gap-4 text-base font-semibold text-foreground"
							>
								<span>{m.cart_total_payable()}</span>
								<span>{formatMoney(cart.total, cart.currency)}</span>
							</div>
						</Card.Content>

						<Card.Footer class="flex-col items-stretch gap-2">
							<Button
								size="lg"
								class="h-10 w-full"
								onclick={() => goto(nextStep)}
								disabled={cart.items.length === 0 || cart.loading}
							>
								{m.cart_continue()}
								<ArrowRight class="size-4" />
							</Button>
							<p class="text-center text-xs text-muted-foreground">
								{isTopup ? m.cart_account_note() : m.cart_shipping_note()}
							</p>
						</Card.Footer>
					</Card.Root>
				</div>
			{/if}
		</main>
	</div>
	<SiteFooter />
</div>

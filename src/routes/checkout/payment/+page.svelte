<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		Banknote,
		CreditCard,
		Gift,
		Lock,
		MapPin,
		QrCode,
		Truck,
		UserRound
	} from '@lucide/svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Checkbox } from '#lib/frontend/components/ui/checkbox/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import * as RadioGroup from '#lib/frontend/components/ui/radio-group/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';
	import * as Tabs from '#lib/frontend/components/ui/tabs/index.ts';
	import { api, ApiError, unwrap } from '#lib/frontend/modules/shared/http.ts';
	import CheckoutSteps from '#lib/frontend/modules/commerce/components/CheckoutSteps.svelte';
	import {
		accountFormPayload,
		isAccountFormComplete
	} from '#lib/frontend/modules/commerce/account-form.ts';
	import { cart } from '#lib/frontend/modules/commerce/cart.svelte.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import { checkout } from '#lib/frontend/modules/commerce/checkout.svelte.ts';
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import type { Address, PaymentMethod } from '#lib/frontend/modules/commerce/models.ts';

	type PaymentMode = 'card' | 'cod' | 'gift' | 'qris';
	type CardType = 'debit' | 'credit';

	interface PaymentPayload {
		mode: PaymentMode;
		paymentMethodId?: string;
		brand?: string;
		last4?: string;
		expMonth?: number;
		expYear?: number;
	}

	let mode = $state<PaymentMode>('card');
	let cardType = $state<CardType>('debit');
	let cardNumber = $state('');
	let cardName = $state('');
	let expDate = $state('');
	let cvv = $state('');
	let paymentMethodId = $state('');
	let saveCard = $state(false);
	let addresses = $state<Address[]>([]);
	let methods = $state<PaymentMethod[]>([]);
	let loading = $state(false);
	let placing = $state(false);
	let ready = $state(false);
	let error = $state('');
	let notice = $state('');

	const isTopup = $derived(site.storefrontLayout === 'topup');
	const accountDetails = $derived(
		site.accountForm
			.map((field) => ({
				id: field.id,
				label: field.label,
				value: (checkout.accountDetails[field.id] ?? '').trim()
			}))
			.filter((detail) => detail.value)
	);
	const detailsStep = $derived(isTopup ? '/checkout/account' : '/checkout/address');
	const activeTab = $derived(mode === 'card' ? cardType : mode);
	const isCard = $derived(mode === 'card');
	const selectedAddress = $derived(
		addresses.find((address) => address.id === checkout.addressId) ?? null
	);
	const selectedShipping = $derived(
		site.shipping.find((option) => option.id === checkout.shippingId) ?? null
	);
	const shipping = $derived(isTopup ? 0 : (selectedShipping?.price ?? 0));
	const total = $derived(cart.total + shipping);
	const selectedMethod = $derived(methods.find((method) => method.id === paymentMethodId) ?? null);

	function handleTabChange(value: string) {
		if (value === 'debit' || value === 'credit') {
			mode = 'card';
			cardType = value;
		} else if (value === 'cod' || value === 'gift' || value === 'qris') {
			mode = value;
		}

		error = '';
		notice = '';
	}

	function cardBrand(digits: string): string {
		if (/^4/.test(digits)) return 'Visa';
		if (/^3[47]/.test(digits)) return 'Amex';
		if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
		return 'Card';
	}

	function parseExpiry(value: string): { month: number; year: number } | null {
		const match = value.replace(/\s/g, '').match(/^(\d{1,2})\/?(\d{2}|\d{4})$/);
		if (!match) return null;

		const month = Number(match[1]);
		const yearPart = Number(match[2]);
		const year = match[2].length === 2 ? 2000 + yearPart : yearPart;

		if (month < 1 || month > 12) return null;
		if (year < 2000 || year > 2100) return null;

		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth() + 1;

		if (year < currentYear || (year === currentYear && month < currentMonth)) return null;

		return { month, year };
	}

	function selectSavedMethod(id: string) {
		paymentMethodId = id;
		mode = 'card';
		error = '';
		notice = '';
	}

	function useNewCard() {
		paymentMethodId = '';
		notice = '';
	}

	function resetForm() {
		cardNumber = '';
		cardName = '';
		expDate = '';
		cvv = '';
		saveCard = false;
		paymentMethodId = '';
		error = '';
		notice = '';
	}

	function readCard(): PaymentPayload | null {
		const digits = cardNumber.replace(/\D/g, '');
		const last4 = digits.slice(-4);

		if (digits.length < 12 || !/^\d{4}$/.test(last4)) {
			error = m.checkout_payment_card_invalid();
			return null;
		}

		const expiry = parseExpiry(expDate);
		if (!expiry) {
			error = m.checkout_payment_expiry_invalid();
			return null;
		}

		if (!/^\d{3,4}$/.test(cvv.trim())) {
			error = m.checkout_payment_cvv_invalid();
			return null;
		}

		return {
			mode: 'card',
			brand: cardBrand(digits),
			last4,
			expMonth: expiry.month,
			expYear: expiry.year
		};
	}

	async function saveCardToAccount() {
		error = '';
		notice = '';

		const details = readCard();
		if (!details) return;

		try {
			const saved = unwrap(
				await api.post<{ data: PaymentMethod }>('/api/payment-methods', {
					brand: details.brand,
					last4: details.last4,
					expMonth: details.expMonth,
					expYear: details.expYear
				})
			);

			methods = [saved, ...methods];
			paymentMethodId = saved.id;
			notice = m.checkout_payment_card_saved();
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 401) {
				await goto('/login?redirectTo=/checkout/payment');
				return;
			}

			error = errorMessage(cause, 'checkout_payment_save_card_failed');
		}
	}

	async function placeOrder() {
		error = '';
		notice = '';

		if (!detailsReady()) {
			await goto(detailsStep);
			return;
		}

		const payment: PaymentPayload = { mode };

		if (mode === 'card') {
			if (paymentMethodId) {
				payment.paymentMethodId = paymentMethodId;
			} else {
				const details = readCard();
				if (!details) return;

				if (saveCard) {
					try {
						const saved = unwrap(
							await api.post<{ data: PaymentMethod }>('/api/payment-methods', {
								brand: details.brand,
								last4: details.last4,
								expMonth: details.expMonth,
								expYear: details.expYear
							})
						);
						payment.paymentMethodId = saved.id;
					} catch (cause) {
						if (cause instanceof ApiError && cause.status === 401) {
							await goto('/login?redirectTo=/checkout/payment');
							return;
						}

						error = errorMessage(cause, 'checkout_payment_save_card_failed');
						return;
					}
				} else {
					payment.brand = details.brand;
					payment.last4 = details.last4;
					payment.expMonth = details.expMonth;
					payment.expYear = details.expYear;
				}
			}
		}

		placing = true;

		try {
			const result = unwrap(
				await api.post<{
					data: { orderId: string; orderNumber: string; payment?: { id: string } };
				}>('/api/checkout', {
					...(isTopup
						? { accountDetails: accountFormPayload(site.accountForm, checkout.accountDetails) }
						: { addressId: checkout.addressId, shippingId: checkout.shippingId }),
					couponCode: cart.cart?.coupon?.code ?? null,
					note: checkout.note || null,
					payment
				})
			);

			checkout.clear();
			await cart.refresh();
			if (mode === 'qris') {
				await goto('/account/payments/' + encodeURIComponent(result.payment?.id ?? result.orderId));
				return;
			}
			await goto('/account/order-tracking?order=' + encodeURIComponent(result.orderNumber));
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 401) {
				await goto('/login?redirectTo=/checkout/payment');
				return;
			}

			error = errorMessage(cause, 'checkout_payment_place_failed');
		} finally {
			placing = false;
		}
	}

	function detailsReady(): boolean {
		if (isTopup) return isAccountFormComplete(site.accountForm, checkout.accountDetails);
		return Boolean(
			checkout.addressId && checkout.shippingId && selectedAddress && selectedShipping
		);
	}

	async function loadData() {
		loading = true;
		error = '';

		try {
			const [addressPayload, methodPayload] = await Promise.all([
				isTopup ? null : api.get<{ data: Address[] }>('/api/addresses'),
				api.get<{ data: PaymentMethod[] }>('/api/payment-methods')
			]);

			addresses = addressPayload ? unwrap(addressPayload) : [];
			methods = unwrap(methodPayload);
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 401) {
				await goto('/login?redirectTo=/checkout/payment');
				return;
			}

			error = errorMessage(cause, 'checkout_payment_load_failed');
		} finally {
			loading = false;
		}
	}

	async function init() {
		checkout.load();
		await Promise.all([cart.refresh(), site.ensure()]);
		await loadData();
		ready = true;

		if (!detailsReady()) await goto(detailsStep);
	}

	onMount(() => {
		void init();
	});
</script>

<div
	class="relative flex size-full flex-col items-center bg-background"
	data-name="Shopix - Payment"
>
	<SiteHeader />
	<div class="flex w-full flex-col items-center bg-white py-10 sm:py-14">
		<main class="mx-auto w-full max-w-[1280px] px-4 sm:px-8">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
					{m.common_payment()}
				</h1>
				<p class="text-sm text-muted-foreground">
					{m.checkout_payment_subtitle()}
				</p>
			</div>

			<CheckoutSteps current="payment" />

			{#if !ready}
				<div
					class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start"
					aria-busy="true"
					aria-live="polite"
				>
					<div class="flex flex-col gap-4">
						<Skeleton class="h-24 w-full rounded-xl" />
						<Skeleton class="h-80 w-full rounded-xl" />
					</div>
					<Skeleton class="h-96 w-full rounded-xl" />
				</div>
			{:else}
				<div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
					<div class="flex min-w-0 flex-col gap-6">
						{#if isTopup}
							<Card.Root>
								<Card.Content class="flex flex-col gap-4 py-4 sm:flex-row sm:items-start">
									<div class="flex min-w-0 flex-1 items-start gap-3">
										<span
											class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
										>
											<UserRound class="size-4" />
										</span>
										<div class="flex min-w-0 flex-col gap-1">
											<p class="text-sm font-medium text-foreground">
												{m.checkout_account_card_title()}
											</p>
											<dl class="grid gap-x-4 gap-y-0.5 text-sm sm:grid-cols-[auto_1fr]">
												{#each accountDetails as detail (detail.id)}
													<dt class="text-muted-foreground">{detail.label}</dt>
													<dd class="font-medium break-words text-foreground">{detail.value}</dd>
												{/each}
											</dl>
										</div>
									</div>
									<a
										href="/checkout/account"
										class="text-sm font-medium underline-offset-4 hover:underline"
									>
										{m.checkout_payment_change()}
									</a>
								</Card.Content>
							</Card.Root>
						{:else if selectedAddress && selectedShipping}
							<Card.Root>
								<Card.Content class="flex flex-col gap-4 py-4 sm:flex-row sm:items-start">
									<div class="flex min-w-0 flex-1 items-start gap-3">
										<span
											class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
										>
											<MapPin class="size-4" />
										</span>
										<div class="flex min-w-0 flex-col gap-0.5">
											<p class="text-sm font-medium text-foreground">
												{m.checkout_payment_deliver_to({ name: selectedAddress.recipientName })}
											</p>
											<p class="text-sm text-muted-foreground">
												{[selectedAddress.line1, selectedAddress.city, selectedAddress.country]
													.filter(Boolean)
													.join(', ')}
											</p>
										</div>
									</div>
									<div class="flex items-center gap-3 sm:flex-col sm:items-end">
										<div class="flex items-center gap-1.5 text-sm text-muted-foreground">
											<Truck class="size-4" />
											<span>{selectedShipping.label}</span>
											<span class="text-xs">
												({m.checkout_days_range({
													min: selectedShipping.minDays,
													max: selectedShipping.maxDays
												})})
											</span>
										</div>
										<a
											href="/checkout/address"
											class="text-sm font-medium underline-offset-4 hover:underline"
										>
											{m.checkout_payment_change()}
										</a>
									</div>
								</Card.Content>
							</Card.Root>
						{/if}

						<Card.Root>
							<Card.Header>
								<Card.Title>{m.checkout_payment_method()}</Card.Title>
								<Card.Description>{m.checkout_payment_method_description()}</Card.Description>
							</Card.Header>
							<Card.Content class="flex flex-col gap-6">
								<Tabs.Root value={activeTab} onValueChange={handleTabChange} class="w-full">
									<Tabs.List class="h-auto w-full flex-wrap">
										<Tabs.Trigger value="debit" class="h-8 flex-1 whitespace-nowrap">
											{m.checkout_payment_tab_debit()}
										</Tabs.Trigger>
										<Tabs.Trigger value="credit" class="h-8 flex-1 whitespace-nowrap">
											{m.checkout_payment_tab_credit()}
										</Tabs.Trigger>
										<Tabs.Trigger value="qris" class="h-8 flex-1 whitespace-nowrap">
											QRIS
										</Tabs.Trigger>
										<Tabs.Trigger value="cod" class="h-8 flex-1 whitespace-nowrap">
											{m.checkout_payment_cod()}
										</Tabs.Trigger>
										<Tabs.Trigger value="gift" class="h-8 flex-1 whitespace-nowrap">
											{m.checkout_payment_gift()}
										</Tabs.Trigger>
									</Tabs.List>
								</Tabs.Root>

								{#if isCard}
									{#if methods.length > 0}
										<div class="flex flex-col gap-3">
											<p class="text-sm font-medium text-foreground">
												{m.checkout_payment_saved_cards()}
											</p>
											<RadioGroup.Root
												value={paymentMethodId}
												onValueChange={(value) => selectSavedMethod(value)}
												class="flex flex-col gap-3"
											>
												{#each methods as method (method.id)}
													<label
														class="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors {paymentMethodId ===
														method.id
															? 'border-primary bg-muted/30 ring-1 ring-primary/20'
															: 'hover:bg-muted/30'}"
													>
														<RadioGroup.Item
															value={method.id}
															aria-label={m.checkout_payment_card_ending({
																brand: method.brand,
																last4: method.last4
															})}
														/>
														<div class="flex min-w-0 flex-1 items-center justify-between gap-3">
															<div class="flex min-w-0 items-center gap-2">
																<CreditCard class="size-4 shrink-0 text-muted-foreground" />
																<span class="truncate text-sm font-medium text-foreground">
																	{method.brand} •••• {method.last4}
																</span>
															</div>
															<span
																class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"
															>
																{String(method.expMonth).padStart(2, '0')}/{String(
																	method.expYear
																).slice(-2)}
																{#if method.isDefault}
																	<Badge variant="secondary">{m.account_payment_default()}</Badge>
																{/if}
															</span>
														</div>
													</label>
												{/each}
											</RadioGroup.Root>
										</div>
									{/if}

									{#if paymentMethodId && selectedMethod}
										<div
											class="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3"
										>
											<p class="text-sm text-muted-foreground">
												{m.checkout_payment_using_card({
													brand: selectedMethod.brand,
													last4: selectedMethod.last4
												})}
											</p>
											<Button variant="link" size="sm" class="h-auto p-0" onclick={useNewCard}>
												{m.checkout_payment_use_new()}
											</Button>
										</div>
									{:else}
										<div class="flex flex-col gap-4">
											<Field.Field>
												<Field.Label for="card-number"
													>{m.checkout_payment_card_number()}</Field.Label
												>
												<Input
													id="card-number"
													inputmode="numeric"
													autocomplete="cc-number"
													placeholder="4242 4242 4242 4242"
													bind:value={cardNumber}
												/>
											</Field.Field>
											<div class="grid gap-4 sm:grid-cols-3">
												<Field.Field>
													<Field.Label for="card-name">{m.checkout_payment_card_name()}</Field.Label
													>
													<Input
														id="card-name"
														autocomplete="cc-name"
														placeholder={m.checkout_payment_card_name_placeholder()}
														bind:value={cardName}
													/>
												</Field.Field>
												<Field.Field>
													<Field.Label for="card-exp">{m.checkout_payment_exp()}</Field.Label>
													<Input
														id="card-exp"
														inputmode="numeric"
														autocomplete="cc-exp"
														placeholder={m.checkout_payment_exp_placeholder()}
														bind:value={expDate}
													/>
												</Field.Field>
												<Field.Field>
													<Field.Label for="card-cvv">{m.checkout_payment_cvv()}</Field.Label>
													<Input
														id="card-cvv"
														type="password"
														inputmode="numeric"
														autocomplete="cc-csc"
														placeholder="CVV"
														bind:value={cvv}
													/>
												</Field.Field>
											</div>
											<div class="flex items-center gap-2">
												<Checkbox id="save-card" bind:checked={saveCard} />
												<Field.Label for="save-card" class="font-normal">
													{m.checkout_payment_save_to_account()}
												</Field.Label>
											</div>
										</div>
									{/if}
								{:else if mode === 'qris'}
									<div class="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
										<span
											class="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground"
										>
											<QrCode class="size-4" />
										</span>
										<div class="flex flex-col gap-0.5">
											<p class="text-sm font-medium text-foreground">
												{m.checkout_payment_qris_title()}
											</p>
											<p class="text-sm text-muted-foreground">
												{m.checkout_payment_qris_description()}
											</p>
										</div>
									</div>
								{:else if mode === 'cod'}
									<div class="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
										<span
											class="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground"
										>
											<Banknote class="size-4" />
										</span>
										<div class="flex flex-col gap-0.5">
											<p class="text-sm font-medium text-foreground">{m.checkout_payment_cod()}</p>
											<p class="text-sm text-muted-foreground">
												{m.checkout_payment_cod_description()}
											</p>
										</div>
									</div>
								{:else if mode === 'gift'}
									<div class="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
										<span
											class="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground"
										>
											<Gift class="size-4" />
										</span>
										<div class="flex flex-col gap-0.5">
											<p class="text-sm font-medium text-foreground">{m.checkout_payment_gift()}</p>
											<p class="text-sm text-muted-foreground">
												{m.checkout_payment_gift_description()}
											</p>
										</div>
									</div>
								{/if}

								{#if error}
									<div
										class="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
										role="alert"
									>
										{error}
									</div>
								{/if}
								{#if notice}
									<div
										class="rounded-lg border border-emerald-600/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
										role="status"
									>
										{notice}
									</div>
								{/if}

								<div class="flex flex-wrap items-center gap-3">
									<Button
										type="button"
										disabled={placing || !isCard || Boolean(paymentMethodId)}
										onclick={saveCardToAccount}
									>
										{m.checkout_payment_save_card()}
									</Button>
									<Button type="button" variant="outline" onclick={resetForm}
										>{m.checkout_payment_reset()}</Button
									>
								</div>
							</Card.Content>
						</Card.Root>
					</div>

					<Card.Root class="lg:sticky lg:top-24">
						<Card.Header>
							<Card.Title>{m.cart_order_summary()}</Card.Title>
							<Card.Description>
								{m.cart_items_in_cart({ count: cart.count })}
							</Card.Description>
						</Card.Header>
						<Card.Content class="flex flex-col gap-4">
							<div class="flex flex-col gap-4">
								{#each cart.items as item (item.id)}
									<div class="flex items-center gap-4">
										<div class="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
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
										<div class="flex min-w-0 flex-1 flex-col gap-0.5">
											<p class="truncate text-sm font-semibold text-foreground">
												{item.productName}
											</p>
											<p class="truncate text-xs text-muted-foreground">{item.variantName}</p>
											<p class="text-xs font-medium text-emerald-600">
												{formatMoney(item.unitPrice, cart.currency)} × {item.quantity}
											</p>
										</div>
									</div>
								{/each}
							</div>

							<Separator />

							<dl class="flex flex-col gap-2.5 text-sm">
								<div class="flex items-start justify-between gap-4">
									<dt class="text-muted-foreground">{m.common_subtotal()}</dt>
									<dd class="font-medium text-foreground">
										{formatMoney(cart.subtotal, cart.currency)}
									</dd>
								</div>
								<div class="flex items-start justify-between gap-4">
									<dt class="text-muted-foreground">{m.cart_subtotal_shipping()}</dt>
									<dd class="font-medium text-foreground">
										{formatMoney(shipping, cart.currency)}
									</dd>
								</div>
								<div class="flex items-start justify-between gap-4">
									<dt class="text-muted-foreground">{m.cart_discount()}</dt>
									<dd class="font-medium text-foreground">
										{formatMoney(cart.discount, cart.currency)}
									</dd>
								</div>
							</dl>

							<Separator />

							<div
								class="flex items-start justify-between gap-4 text-base font-semibold text-foreground"
							>
								<span>{m.cart_total_payable()}</span>
								<span>{formatMoney(total, cart.currency)}</span>
							</div>
						</Card.Content>
						<Card.Footer class="flex-col items-stretch gap-2">
							<Button
								size="lg"
								class="h-10 w-full"
								disabled={placing || loading || !ready}
								onclick={placeOrder}
							>
								{#if placing}
									<Spinner />
								{:else}
									<Lock class="size-4" />
								{/if}
								{placing ? m.checkout_payment_placing() : m.checkout_payment_place()}
							</Button>
							<p class="text-center text-xs text-muted-foreground">
								{m.checkout_payment_secure()}
							</p>
						</Card.Footer>
					</Card.Root>
				</div>
			{/if}
		</main>
	</div>
	<SiteFooter />
</div>

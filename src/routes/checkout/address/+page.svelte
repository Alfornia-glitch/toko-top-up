<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		ArrowRight,
		CreditCard,
		MapPin,
		Phone,
		PlusCircle,
		ShoppingCart,
		Truck
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
	import { api, ApiError, unwrap } from '#lib/frontend/modules/shared/http.ts';
	import { cart } from '#lib/frontend/modules/commerce/cart.svelte.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import { checkout } from '#lib/frontend/modules/commerce/checkout.svelte.ts';
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import type { Address } from '#lib/frontend/modules/commerce/models.ts';

	interface AddressForm {
		label: string;
		recipientName: string;
		phone: string;
		line1: string;
		line2: string;
		city: string;
		region: string;
		postalCode: string;
		country: string;
		isDefaultShipping: boolean;
		isDefaultBilling: boolean;
	}

	let addresses = $state<Address[]>([]);
	let loadingAddresses = $state(false);
	let ready = $state(false);
	let submitting = $state(false);
	let error = $state('');
	let formError = $state('');

	let form = $state<AddressForm>({
		label: '',
		recipientName: '',
		phone: '',
		line1: '',
		line2: '',
		city: '',
		region: '',
		postalCode: '',
		country: '',
		isDefaultShipping: false,
		isDefaultBilling: false
	});

	const selectedShipping = $derived(
		site.shipping.find((option) => option.id === checkout.shippingId) ?? null
	);
	const shipping = $derived(selectedShipping?.price ?? 0);
	const total = $derived(cart.total + shipping);

	function resetForm() {
		form = {
			label: '',
			recipientName: '',
			phone: '',
			line1: '',
			line2: '',
			city: '',
			region: '',
			postalCode: '',
			country: '',
			isDefaultShipping: false,
			isDefaultBilling: false
		};
	}

	function applyAddressDefault() {
		if (addresses.length === 0) {
			checkout.addressId = '';
			return;
		}

		if (addresses.some((address) => address.id === checkout.addressId)) return;

		const preferred = addresses.find((address) => address.isDefaultShipping) ?? addresses[0];
		checkout.selectAddress(preferred.id);
	}

	function applyShippingDefault() {
		const options = site.shipping;
		if (options.length === 0) return;
		if (options.some((option) => option.id === checkout.shippingId)) return;
		checkout.selectShipping(options[0].id);
	}

	async function loadAddresses() {
		loadingAddresses = true;
		error = '';

		try {
			const data = unwrap(await api.get<{ data: Address[] }>('/api/addresses'));
			addresses = data;
			applyAddressDefault();
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 401) {
				await goto('/login?redirectTo=/checkout/address');
				return;
			}

			error = errorMessage(cause, 'checkout_address_load_failed');
		} finally {
			loadingAddresses = false;
		}
	}

	async function submitAddress(event: SubmitEvent) {
		event.preventDefault();
		formError = '';

		if (
			!form.recipientName.trim() ||
			!form.line1.trim() ||
			!form.city.trim() ||
			!form.country.trim()
		) {
			formError = m.checkout_address_required();
			return;
		}

		submitting = true;

		try {
			const created = unwrap(
				await api.post<{ data: Address }>('/api/addresses', {
					label: form.label.trim() || null,
					recipientName: form.recipientName.trim(),
					phone: form.phone.trim() || null,
					line1: form.line1.trim(),
					line2: form.line2.trim() || null,
					city: form.city.trim(),
					region: form.region.trim() || null,
					postalCode: form.postalCode.trim() || null,
					country: form.country.trim(),
					isDefaultShipping: form.isDefaultShipping,
					isDefaultBilling: form.isDefaultBilling
				})
			);

			addresses = [created, ...addresses];
			checkout.selectAddress(created.id);
			resetForm();
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 401) {
				await goto('/login?redirectTo=/checkout/address');
				return;
			}

			formError = errorMessage(cause, 'account_addresses_save_failed');
		} finally {
			submitting = false;
		}
	}

	async function continueToPayment() {
		error = '';

		if (!checkout.addressId) {
			error = m.checkout_address_select_required();
			return;
		}

		if (!checkout.shippingId) {
			error = m.checkout_address_speed_required();
			return;
		}

		checkout.persist();
		await goto('/checkout/payment');
	}

	async function init() {
		checkout.load();
		await Promise.all([cart.refresh(), site.ensure()]);
		await loadAddresses();
		applyShippingDefault();
		ready = true;
	}

	onMount(() => {
		void init();
	});
</script>

<div
	class="relative flex size-full flex-col items-center bg-background"
	data-name="Shopix - Address"
>
	<SiteHeader />
	<div class="flex w-full flex-col items-center bg-white py-10 sm:py-14">
		<main class="mx-auto w-full max-w-[1280px] px-4 sm:px-8">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
					{m.checkout_address_title()}
				</h1>
				<p class="text-sm text-muted-foreground">
					{m.checkout_address_subtitle()}
				</p>
			</div>

			<nav
				aria-label={m.cart_checkout_progress()}
				class="mt-6 rounded-xl border bg-muted/40 p-4 sm:p-5"
			>
				<div class="flex items-center gap-2 sm:gap-4">
					<a href="/cart" class="flex items-center gap-2 sm:gap-3">
						<span
							class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
						>
							<ShoppingCart class="size-4" />
						</span>
						<span class="text-sm font-medium text-foreground sm:text-base">{m.common_cart()}</span>
					</a>
					<div class="h-px flex-1 bg-border" aria-hidden="true"></div>
					<a href="/checkout/address" aria-current="step" class="flex items-center gap-2 sm:gap-3">
						<span
							class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
						>
							<MapPin class="size-4" />
						</span>
						<span class="text-sm font-medium text-foreground sm:text-base"
							>{m.common_address()}</span
						>
					</a>
					<div class="h-px flex-1 bg-border" aria-hidden="true"></div>
					<a href="/checkout/payment" class="flex items-center gap-2 sm:gap-3">
						<span
							class="flex size-9 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground"
						>
							<CreditCard class="size-4" />
						</span>
						<span class="text-sm font-medium text-muted-foreground sm:text-base"
							>{m.common_payment()}</span
						>
					</a>
				</div>
			</nav>

			{#if !ready}
				<div
					class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start"
					aria-busy="true"
					aria-live="polite"
				>
					<div class="flex flex-col gap-4">
						<Skeleton class="h-40 w-full rounded-xl" />
						<Skeleton class="h-28 w-full rounded-xl" />
						<Skeleton class="h-72 w-full rounded-xl" />
					</div>
					<Skeleton class="h-96 w-full rounded-xl" />
				</div>
			{:else if cart.items.length === 0}
				<Card.Root class="mt-8">
					<Card.Content class="flex flex-col items-center gap-4 py-12 text-center">
						<div class="flex size-14 items-center justify-center rounded-full bg-muted">
							<ShoppingCart class="size-7 text-muted-foreground" />
						</div>
						<div class="flex flex-col gap-1">
							<Card.Title class="text-lg">{m.cart_empty_title()}</Card.Title>
							<Card.Description>
								{m.checkout_address_empty_description()}
							</Card.Description>
						</div>
						<Button href="/cart">{m.checkout_back_to_cart()}</Button>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
					<div class="flex min-w-0 flex-col gap-6">
						<Card.Root>
							<Card.Header>
								<Card.Title>{m.checkout_address_title()}</Card.Title>
								<Card.Description>{m.checkout_address_description()}</Card.Description>
							</Card.Header>
							<Card.Content class="flex flex-col gap-4">
								{#if loadingAddresses}
									<div class="flex flex-col gap-3" aria-busy="true" aria-live="polite">
										<Skeleton class="h-24 w-full rounded-xl" />
										<Skeleton class="h-24 w-full rounded-xl" />
									</div>
								{:else if addresses.length === 0}
									<div
										class="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center"
									>
										<MapPin class="size-6 text-muted-foreground" />
										<p class="text-sm text-muted-foreground">
											{m.checkout_address_none()}
										</p>
									</div>
								{:else}
									<RadioGroup.Root
										value={checkout.addressId}
										onValueChange={(value) => checkout.selectAddress(value)}
										class="flex flex-col gap-3"
									>
										{#each addresses as address (address.id)}
											<label
												class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors {checkout.addressId ===
												address.id
													? 'border-primary bg-muted/30 ring-1 ring-primary/20'
													: 'hover:bg-muted/30'}"
											>
												<RadioGroup.Item
													value={address.id}
													class="mt-0.5"
													aria-label={address.recipientName}
												/>
												<div class="flex min-w-0 flex-1 flex-col gap-2">
													<div class="flex flex-wrap items-center gap-2">
														<span class="text-sm font-medium text-foreground sm:text-base">
															{address.recipientName}
														</span>
														{#if address.isDefaultShipping}
															<Badge variant="secondary">{m.account_payment_default()}</Badge>
														{/if}
														{#if address.label}
															<Badge variant="outline">{address.label}</Badge>
														{/if}
													</div>
													<div class="text-sm leading-relaxed text-muted-foreground">
														<p>{address.line1}</p>
														{#if address.line2}
															<p>{address.line2}</p>
														{/if}
														<p>
															{[address.city, address.region, address.postalCode, address.country]
																.filter(Boolean)
																.join(', ')}
														</p>
													</div>
													{#if address.phone}
														<div class="flex items-center gap-1.5 text-sm text-muted-foreground">
															<Phone class="size-3.5" />
															<span>{address.phone}</span>
														</div>
													{/if}
												</div>
											</label>
										{/each}
									</RadioGroup.Root>
								{/if}

								{#if error}
									<div
										class="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
										role="alert"
									>
										{error}
									</div>
								{/if}
							</Card.Content>
						</Card.Root>

						<Card.Root>
							<Card.Header>
								<Card.Title>{m.checkout_address_speed_title()}</Card.Title>
								<Card.Description>{m.checkout_address_speed_description()}</Card.Description>
							</Card.Header>
							<Card.Content>
								{#if site.shipping.length === 0}
									<p class="text-sm text-muted-foreground">
										{m.checkout_address_speed_unavailable()}
									</p>
								{:else}
									<RadioGroup.Root
										value={checkout.shippingId}
										onValueChange={(value) => checkout.selectShipping(value)}
										class="grid gap-3 sm:grid-cols-2"
									>
										{#each site.shipping as option (option.id)}
											<label
												class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors {checkout.shippingId ===
												option.id
													? 'border-primary bg-muted/30 ring-1 ring-primary/20'
													: 'hover:bg-muted/30'}"
											>
												<RadioGroup.Item
													value={option.id}
													class="mt-0.5"
													aria-label={option.label}
												/>
												<div class="flex min-w-0 flex-1 flex-col gap-1">
													<div class="flex items-start justify-between gap-2">
														<span class="text-sm font-medium text-foreground">
															{option.label}
														</span>
														<Badge variant="secondary">
															{formatMoney(option.price, cart.currency)}
														</Badge>
													</div>
													<p class="text-sm text-muted-foreground">{option.description}</p>
													<p class="flex items-center gap-1.5 text-xs text-muted-foreground">
														<Truck class="size-3.5" />
														{m.checkout_days_range({ min: option.minDays, max: option.maxDays })}
													</p>
												</div>
											</label>
										{/each}
									</RadioGroup.Root>
								{/if}
							</Card.Content>
						</Card.Root>

						<Card.Root>
							<Card.Header>
								<Card.Title class="flex items-center gap-2">
									<PlusCircle class="size-5 text-muted-foreground" />
									{m.checkout_address_new_title()}
								</Card.Title>
								<Card.Description>{m.checkout_address_new_description()}</Card.Description>
							</Card.Header>
							<Card.Content>
								<form class="flex flex-col gap-4" onsubmit={submitAddress}>
									<div class="grid gap-4 sm:grid-cols-2">
										<Field.Field>
											<Field.Label for="address-label">{m.checkout_address_label()}</Field.Label>
											<Input
												id="address-label"
												bind:value={form.label}
												autocomplete="organization"
												placeholder={m.checkout_address_label_placeholder()}
											/>
										</Field.Field>
										<Field.Field>
											<Field.Label for="address-recipient"
												>{m.checkout_address_recipient()}</Field.Label
											>
											<Input
												id="address-recipient"
												bind:value={form.recipientName}
												autocomplete="name"
												required
											/>
										</Field.Field>
										<Field.Field>
											<Field.Label for="address-phone">{m.checkout_address_phone()}</Field.Label>
											<Input id="address-phone" bind:value={form.phone} autocomplete="tel" />
										</Field.Field>
										<Field.Field>
											<Field.Label for="address-country">{m.checkout_address_country()}</Field.Label
											>
											<Input
												id="address-country"
												bind:value={form.country}
												autocomplete="country-name"
												required
											/>
										</Field.Field>
										<Field.Field class="sm:col-span-2">
											<Field.Label for="address-line1">{m.checkout_address_line1()}</Field.Label>
											<Input
												id="address-line1"
												bind:value={form.line1}
												autocomplete="address-line1"
												required
											/>
										</Field.Field>
										<Field.Field class="sm:col-span-2">
											<Field.Label for="address-line2">{m.checkout_address_line2()}</Field.Label>
											<Input
												id="address-line2"
												bind:value={form.line2}
												autocomplete="address-line2"
											/>
										</Field.Field>
										<Field.Field>
											<Field.Label for="address-city">{m.checkout_address_city()}</Field.Label>
											<Input
												id="address-city"
												bind:value={form.city}
												autocomplete="address-level2"
												required
											/>
										</Field.Field>
										<Field.Field>
											<Field.Label for="address-region">{m.checkout_address_region()}</Field.Label>
											<Input
												id="address-region"
												bind:value={form.region}
												autocomplete="address-level1"
											/>
										</Field.Field>
										<Field.Field>
											<Field.Label for="address-postal">{m.checkout_address_postal()}</Field.Label>
											<Input
												id="address-postal"
												bind:value={form.postalCode}
												autocomplete="postal-code"
											/>
										</Field.Field>
									</div>

									<div class="flex flex-col gap-2">
										<div class="flex items-center gap-2">
											<Checkbox
												id="address-default-shipping"
												bind:checked={form.isDefaultShipping}
											/>
											<Field.Label for="address-default-shipping" class="font-normal">
												{m.checkout_address_default_shipping()}
											</Field.Label>
										</div>
										<div class="flex items-center gap-2">
											<Checkbox id="address-default-billing" bind:checked={form.isDefaultBilling} />
											<Field.Label for="address-default-billing" class="font-normal">
												{m.checkout_address_default_billing()}
											</Field.Label>
										</div>
									</div>

									{#if formError}
										<Field.Error>{formError}</Field.Error>
									{/if}

									<Button type="submit" class="w-full sm:w-auto" disabled={submitting}>
										{#if submitting}
											<Spinner />
										{/if}
										{submitting ? m.common_saving() : m.checkout_address_save()}
									</Button>
								</form>
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
							<Button size="lg" class="h-10 w-full" onclick={continueToPayment}>
								{m.checkout_address_continue()}
								<ArrowRight class="size-4" />
							</Button>
						</Card.Footer>
					</Card.Root>
				</div>
			{/if}
		</main>
	</div>
	<SiteFooter />
</div>

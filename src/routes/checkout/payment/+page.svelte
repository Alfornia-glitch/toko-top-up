<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import { api, ApiError, unwrap } from '#lib/frontend/modules/commerce/http.ts';
	import { cart } from '#lib/frontend/modules/commerce/cart.svelte.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import { checkout } from '#lib/frontend/modules/commerce/checkout.svelte.ts';
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import type { Address, PaymentMethod } from '#lib/frontend/modules/commerce/models.ts';

	type PaymentMode = 'card' | 'cod' | 'gift';
	type CardType = 'debit' | 'credit';

	interface PaymentPayload {
		mode: PaymentMode;
		paymentMethodId?: string;
		brand?: string;
		last4?: string;
		expMonth?: number;
		expYear?: number;
	}

	const imgShoppingCart = '/assets/64b14.svg';
	const imgMapPin = '/assets/a58c0.svg';
	const imgDollarSign = '/assets/43c76.svg';
	const imgSeparator = '/assets/72948.svg';

	const activeTabClass =
		'relative flex min-w-px flex-[1_0_0] content-stretch items-center justify-center gap-[4px] overflow-clip rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[6px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]';
	const inactiveTabClass =
		'relative flex min-w-px flex-[1_0_0] content-stretch items-center justify-center gap-[4px] rounded-[10px] px-[10px] py-[6px]';

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

	const isCard = $derived(mode === 'card');
	const selectedAddress = $derived(
		addresses.find((address) => address.id === checkout.addressId) ?? null
	);
	const selectedShipping = $derived(
		site.shipping.find((option) => option.id === checkout.shippingId) ?? null
	);
	const shippingCents = $derived(selectedShipping?.priceCents ?? 0);
	const totalCents = $derived(cart.totalCents + shippingCents);
	const selectedMethod = $derived(methods.find((method) => method.id === paymentMethodId) ?? null);

	function tabClass(active: boolean) {
		return active ? activeTabClass : inactiveTabClass;
	}

	function tabTextClass(active: boolean) {
		return `relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap ${
			active ? 'text-[#0a0a0a]' : 'text-[#0a0a0a] opacity-60'
		}`;
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
			error = 'Enter a valid card number.';
			return null;
		}

		const expiry = parseExpiry(expDate);
		if (!expiry) {
			error = 'Enter a valid expiry date in MM/YY format.';
			return null;
		}

		if (!/^\d{3,4}$/.test(cvv.trim())) {
			error = 'Enter a valid CVV.';
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
			notice = 'Card saved to your account.';
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 401) {
				await goto('/login?redirectTo=/checkout/payment');
				return;
			}

			error = cause instanceof Error ? cause.message : 'Could not save your card';
		}
	}

	async function placeOrder() {
		error = '';
		notice = '';

		if (!checkout.addressId || !checkout.shippingId) {
			await goto('/checkout/address');
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

						error = cause instanceof Error ? cause.message : 'Could not save your card';
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
				await api.post<{ data: { orderId: string; orderNumber: string } }>('/api/checkout', {
					addressId: checkout.addressId,
					shippingId: checkout.shippingId,
					couponCode: cart.cart?.coupon?.code ?? null,
					note: checkout.note || null,
					payment
				})
			);

			checkout.clear();
			await cart.refresh();
			await goto('/account/order-tracking?order=' + encodeURIComponent(result.orderNumber));
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 401) {
				await goto('/login?redirectTo=/checkout/payment');
				return;
			}

			error = cause instanceof Error ? cause.message : 'Could not place your order';
		} finally {
			placing = false;
		}
	}

	async function loadData() {
		loading = true;
		error = '';

		try {
			const [addressPayload, methodPayload] = await Promise.all([
				api.get<{ data: Address[] }>('/api/addresses'),
				api.get<{ data: PaymentMethod[] }>('/api/payment-methods')
			]);

			addresses = unwrap(addressPayload);
			methods = unwrap(methodPayload);
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 401) {
				await goto('/login?redirectTo=/checkout/payment');
				return;
			}

			error = cause instanceof Error ? cause.message : 'Could not load checkout details';
		} finally {
			loading = false;
		}
	}

	async function init() {
		checkout.load();
		await Promise.all([cart.refresh(), site.ensure()]);
		await loadData();
		ready = true;

		if (!checkout.addressId || !checkout.shippingId || !selectedAddress || !selectedShipping) {
			await goto('/checkout/address');
		}
	}

	onMount(() => {
		void init();
	});
</script>

<div
	class="relative flex size-full flex-col content-stretch items-center bg-white"
	data-name="Shopix - Payment"
>
	<SiteHeader />
	<div
		class="relative flex w-full max-w-[1440px] shrink-0 flex-col content-stretch items-center justify-center bg-white py-[56px]"
		data-name="Checkout"
	>
		<div
			class="relative flex w-full max-w-[1280px] min-w-[328px] shrink-0 flex-col content-stretch items-start justify-center gap-[16px] px-[32px]"
			data-name="Flex Vertical"
		>
			<div
				class="relative flex h-[136px] w-full shrink-0 flex-col content-stretch items-center rounded-[8px] border border-solid border-[#e5e5e5] bg-[#f5f5f5] pt-[32px]"
				data-name="Flex Vertical"
			>
				<div
					class="relative flex w-[548px] shrink-0 content-stretch items-center justify-center"
					data-name="Steps Horizontal"
				>
					<div
						class="relative flex shrink-0 content-stretch items-center"
						data-name="Steps / Step item"
					>
						<div
							class="relative flex size-[38px] shrink-0 flex-col content-stretch items-start gap-[10px]"
							data-name="step-details"
						>
							<div
								class="relative flex size-[38px] shrink-0 flex-col content-stretch items-center justify-center rounded-[9999px] bg-black p-[8px] drop-shadow-[0px_1px_1.5px_rgba(0,0,0,0.1),0px_1px_1px_rgba(0,0,0,0.1)]"
								data-name="step-icon"
							>
								<div class="relative size-[22px] shrink-0" data-name="check">
									<img
										alt=""
										class="absolute inset-0 block size-full max-w-none"
										src={imgShoppingCart}
									/>
								</div>
							</div>
							<div
								class="relative flex shrink-0 flex-col content-stretch items-center justify-center gap-[2px]"
								data-name="Text"
							>
								<a
									href="/cart"
									class="relative w-[min-content] min-w-full shrink-0 font-['Geist:Medium'] text-[16px] leading-[24px] font-medium [word-break:break-word] text-[#0a0a0a] hover:underline"
									>Cart</a
								>
							</div>
						</div>
					</div>
					<div
						class="relative flex min-w-px flex-[1_0_0] content-stretch items-center"
						data-name="Steps / Step item"
					>
						<div
							class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-center px-[8px]"
							data-name="Divider"
						>
							<div class="relative h-[2px] w-full shrink-0 bg-[#e5e5e5]" data-name="progress"></div>
						</div>
						<div
							class="relative flex size-[38px] shrink-0 flex-col content-stretch items-start gap-[10px]"
							data-name="step-details"
						>
							<div
								class="relative flex size-[38px] shrink-0 flex-col content-stretch items-center justify-center rounded-[9999px] bg-black p-[8px]"
								data-name="step-icon"
							>
								<div class="relative size-[22px] shrink-0" data-name="check">
									<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgMapPin} />
								</div>
							</div>
							<div
								class="relative flex shrink-0 flex-col content-stretch items-center justify-center gap-[2px]"
								data-name="Text"
							>
								<a
									href="/checkout/address"
									class="relative w-[min-content] min-w-full shrink-0 font-['Geist:Medium'] text-[16px] leading-[24px] font-medium [word-break:break-word] text-[#0a0a0a] hover:underline"
									>Address</a
								>
							</div>
						</div>
					</div>
					<div
						class="relative flex min-w-px flex-[1_0_0] content-stretch items-center"
						data-name="Steps / Step item"
					>
						<div
							class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-center px-[8px]"
							data-name="Divider"
						>
							<div class="relative h-[2px] w-full shrink-0 bg-[#e5e5e5]" data-name="progress"></div>
						</div>
						<div
							class="relative flex size-[38px] shrink-0 flex-col content-stretch items-start gap-[10px]"
							data-name="step-details"
						>
							<div
								class="relative flex size-[38px] shrink-0 flex-col content-stretch items-center justify-center rounded-[9999px] bg-black p-[8px]"
								data-name="step-icon"
							>
								<div class="relative size-[22px] shrink-0" data-name="check">
									<img
										alt=""
										class="absolute inset-0 block size-full max-w-none"
										src={imgDollarSign}
									/>
								</div>
							</div>
							<div
								class="relative flex shrink-0 flex-col content-stretch items-center justify-center gap-[2px]"
								data-name="Text"
							>
								<a
									href="/checkout/payment"
									class="relative w-[min-content] min-w-full shrink-0 text-center font-['Geist:Medium'] text-[16px] leading-[24px] font-medium [word-break:break-word] text-[#0a0a0a] hover:underline"
									>Payment</a
								>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div
				class="relative flex w-full shrink-0 content-stretch items-start gap-[16px]"
				data-name="Flex Horizontal"
			>
				<div
					class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[24px] overflow-clip rounded-[14px] bg-white py-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
					data-name="Card"
				>
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start px-[16px]"
						data-name="card-header"
					>
						<p
							class="relative h-[22px] w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
						>
							Select Payment Mode
						</p>
					</div>
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[24px] px-[16px]"
						data-name="card-body"
					>
						<div
							class="relative isolate flex w-full shrink-0 flex-wrap content-center items-center overflow-clip rounded-[10px] bg-[#f5f5f5] p-[3px]"
							data-name="Advance Tabs"
						>
							<div
								class="relative z-[1] flex min-w-px flex-[1_0_0] content-stretch items-center"
								data-name="Items"
							>
								<button
									type="button"
									class={tabClass(mode === 'card' && cardType === 'debit')}
									data-name="Tab 01"
									onclick={() => {
										mode = 'card';
										cardType = 'debit';
										error = '';
										notice = '';
									}}
								>
									<p class={tabTextClass(mode === 'card' && cardType === 'debit')}>Debit Card</p>
								</button>
								<button
									type="button"
									class={tabClass(mode === 'card' && cardType === 'credit')}
									data-name="Tab 02"
									onclick={() => {
										mode = 'card';
										cardType = 'credit';
										error = '';
										notice = '';
									}}
								>
									<p class={tabTextClass(mode === 'card' && cardType === 'credit')}>Credit Card</p>
								</button>
								<button
									type="button"
									class={tabClass(mode === 'cod')}
									data-name="Tab item"
									onclick={() => {
										mode = 'cod';
										error = '';
										notice = '';
									}}
								>
									<p class={tabTextClass(mode === 'cod')}>Cash on delivery</p>
								</button>
								<button
									type="button"
									class={tabClass(mode === 'gift')}
									data-name="Tab 04"
									onclick={() => {
										mode = 'gift';
										error = '';
										notice = '';
									}}
								>
									<p class={tabTextClass(mode === 'gift')}>Gift card</p>
								</button>
							</div>
						</div>

						{#if isCard}
							{#if methods.length > 0}
								<div
									class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[8px]"
									data-name="Flex Vertical"
								>
									<p
										class="relative w-full shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] text-[#0a0a0a]"
									>
										Saved cards
									</p>
									{#each methods as method (method.id)}
										<button
											type="button"
											class="relative flex w-full shrink-0 cursor-pointer content-stretch items-center justify-between gap-[12px] rounded-[10px] border border-solid bg-white px-[10px] py-[8px] text-left {paymentMethodId ===
											method.id
												? 'border-[#171717]'
												: 'border-[#e5e5e5]'}"
											data-name="Card Radio"
											onclick={() => selectSavedMethod(method.id)}
										>
											<span
												class="relative font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
											>
												{method.brand} •••• {method.last4}
											</span>
											<span
												class="relative flex items-center gap-[8px] font-['Geist:Regular'] text-[12px] leading-[16px] text-[#737373]"
											>
												{String(method.expMonth).padStart(2, '0')}/{String(method.expYear).slice(
													-2
												)}
												{#if method.isDefault}
													<span class="rounded-[8px] bg-[#f5f5f5] px-[6px] py-[2px]">Default</span>
												{/if}
											</span>
										</button>
									{/each}
								</div>
							{/if}

							{#if paymentMethodId && selectedMethod}
								<div
									class="relative flex w-full shrink-0 content-stretch items-center justify-between gap-[12px] rounded-[10px] border border-solid border-[#e5e5e5] bg-[#f5f5f5] px-[10px] py-[8px]"
									data-name="Flex Horizontal"
								>
									<p
										class="relative font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]"
									>
										Using {selectedMethod.brand} ending in {selectedMethod.last4}
									</p>
									<button
										type="button"
										class="relative shrink-0 cursor-pointer font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a] hover:underline"
										onclick={useNewCard}
									>
										Use a new card
									</button>
								</div>
							{:else}
								<div
									class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[24px]"
									data-name="Flex Vertical"
								>
									<div
										class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[14px]"
										data-name="Flex Vertical"
									>
										<label
											for="card-number"
											class="relative w-full shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] text-[#0a0a0a]"
										>
											Card Number
										</label>
										<div
											class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[8px]"
											data-name="Default Input"
										>
											<input
												id="card-number"
												class="relative flex h-[32px] w-full rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a] outline-none focus:border-[#171717]"
												inputmode="numeric"
												autocomplete="cc-number"
												placeholder="Card number"
												bind:value={cardNumber}
											/>
										</div>
									</div>
									<div
										class="relative flex w-full min-w-[280px] shrink-0 flex-wrap content-start items-start gap-[24px]"
										data-name="Flex Horizontal"
									>
										<label
											class="relative flex min-w-[160px] shrink-0 flex-col content-stretch items-start gap-[14px]"
											data-name="Flex Vertical"
										>
											<span
												class="relative w-[min-content] min-w-full shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] text-[#0a0a0a]"
											>
												Card Name
											</span>
											<input
												class="relative h-[32px] w-[288px] rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a] outline-none focus:border-[#171717]"
												autocomplete="cc-name"
												placeholder="Name on card"
												bind:value={cardName}
											/>
										</label>
										<label
											class="relative flex min-w-[77px] flex-[1_0_0] flex-col content-stretch items-start gap-[14px]"
											data-name="Flex Vertical"
										>
											<span
												class="relative w-full shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] text-[#0a0a0a]"
											>
												Exp. Date
											</span>
											<input
												class="relative h-[32px] w-full rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a] outline-none focus:border-[#171717]"
												inputmode="numeric"
												autocomplete="cc-exp"
												placeholder="MM/YY"
												bind:value={expDate}
											/>
										</label>
										<label
											class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[14px]"
											data-name="Flex Vertical"
										>
											<span
												class="relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
											>
												CVV Code
											</span>
											<input
												class="relative h-[32px] w-full rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a] outline-none focus:border-[#171717]"
												type="password"
												inputmode="numeric"
												autocomplete="cc-csc"
												placeholder="CVV"
												bind:value={cvv}
											/>
										</label>
									</div>
								</div>
							{/if}
						{/if}

						{#if error}
							<p class="relative font-['Geist:Regular'] text-[14px] leading-[20px] text-red-600">
								{error}
							</p>
						{/if}
						{#if notice}
							<p class="relative font-['Geist:Regular'] text-[14px] leading-[20px] text-[#16a34a]">
								{notice}
							</p>
						{/if}

						<div
							class="relative flex w-full shrink-0 content-stretch items-start gap-[14px]"
							data-name="Actions"
						>
							<button
								type="button"
								class="relative flex shrink-0 cursor-pointer content-stretch items-center justify-center gap-[6px] overflow-clip rounded-[10px] border border-solid border-[#171717] bg-[#171717] px-[16px] py-[8px] disabled:cursor-not-allowed disabled:opacity-60"
								data-name="Solid Button"
								disabled={placing || !isCard || Boolean(paymentMethodId)}
								onclick={saveCardToAccount}
							>
								<div
									class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#fafafa]"
								>
									<p class="leading-[20px]">Save card</p>
								</div>
							</button>
							<button
								type="button"
								class="relative flex shrink-0 cursor-pointer content-stretch items-center justify-center gap-[6px] overflow-clip rounded-[10px] border border-solid border-[#f5f5f5] bg-[#f5f5f5] px-[16px] py-[8px]"
								data-name="Solid Button"
								onclick={resetForm}
							>
								<div
									class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#171717]"
								>
									<p class="leading-[20px]">Reset form</p>
								</div>
							</button>
						</div>
					</div>
				</div>

				<div
					class="relative flex max-w-[522px] min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[24px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
					data-name="Card"
				>
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[24px] px-[24px]"
						data-name="card-body"
					>
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[6px] [word-break:break-word]"
							data-name="Flex Vertical"
						>
							<p
								class="relative w-[min-content] min-w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold text-[#0a0a0a]"
							>
								Pricing Details
							</p>
							<p
								class="relative shrink-0 text-center font-['Geist:Regular'] text-[16px] leading-[24px] font-normal whitespace-nowrap text-[#737373]"
							>
								You have {cart.count}
								{cart.count === 1 ? 'item' : 'items'} in your cart
							</p>
						</div>

						{#each cart.items as item (item.id)}
							<div
								class="relative flex w-full shrink-0 content-stretch items-center gap-[16px]"
								data-name="Flex Horizontal"
							>
								<div
									class="relative h-[86px] w-[92px] shrink-0 overflow-hidden rounded-[8px] bg-[#f5f5f5]"
									data-name="image 110"
								>
									{#if item.imageUrl}
										<img alt="" class="size-full object-cover" src={item.imageUrl} />
									{/if}
								</div>
								<div
									class="relative flex min-h-[72px] min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[4px] [word-break:break-word]"
									data-name="Flex Vertical"
								>
									<p
										class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold text-[#0a0a0a]"
									>
										{item.productName}
									</p>
									<p
										class="relative w-full shrink-0 font-['Geist:Regular'] text-[14px] leading-[20px] font-normal text-[#737373]"
									>
										{item.variantName}
									</p>
									<div
										class="relative flex w-full shrink-0 flex-col justify-center font-['Geist:Regular'] text-[12px] leading-[16px] font-normal text-[#16a34a]"
									>
										<p class="leading-[16px]">
											{formatMoney(item.unitPriceCents, cart.currency)} × {item.quantity}
										</p>
									</div>
								</div>
							</div>
						{/each}

						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[14px] text-[18px] leading-[28px] [word-break:break-word] text-[#0a0a0a]"
							data-name="Flex Vertical"
						>
							<div
								class="relative flex w-full shrink-0 content-stretch items-start gap-[24px]"
								data-name="Flex Horizontal"
							>
								<p class="relative min-w-px flex-[1_0_0] font-['Geist:Regular'] font-normal">
									Subtotal
								</p>
								<p class="relative shrink-0 font-['Geist:Medium'] font-medium whitespace-nowrap">
									{formatMoney(cart.subtotalCents, cart.currency)}
								</p>
							</div>
							<div
								class="relative flex w-full shrink-0 content-stretch items-start gap-[24px]"
								data-name="Flex Horizontal"
							>
								<p class="relative min-w-px flex-[1_0_0] font-['Geist:Regular'] font-normal">
									Shipping Cost (+)
								</p>
								<p class="relative shrink-0 font-['Geist:Medium'] font-medium whitespace-nowrap">
									{formatMoney(shippingCents, cart.currency)}
								</p>
							</div>
							<div
								class="relative flex w-full shrink-0 content-stretch items-start gap-[24px]"
								data-name="Flex Horizontal"
							>
								<p class="relative min-w-px flex-[1_0_0] font-['Geist:Regular'] font-normal">
									Discount (-)
								</p>
								<p class="relative shrink-0 font-['Geist:Medium'] font-medium whitespace-nowrap">
									{formatMoney(cart.discountCents, cart.currency)}
								</p>
							</div>
						</div>
						<div class="relative h-0 w-full shrink-0" data-name="Separator">
							<div class="absolute inset-[-1px_0_0_0]">
								<img alt="" class="block size-full max-w-none" src={imgSeparator} />
							</div>
						</div>
						<div
							class="relative flex w-full shrink-0 content-stretch items-start gap-[24px] text-[18px] leading-[28px] [word-break:break-word] text-[#0a0a0a]"
							data-name="Flex Horizontal"
						>
							<p class="relative min-w-px flex-[1_0_0] font-['Geist:Medium'] font-medium">
								Total Payable
							</p>
							<p class="relative shrink-0 font-['Geist:SemiBold'] font-semibold whitespace-nowrap">
								{formatMoney(totalCents, cart.currency)}
							</p>
						</div>
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start"
							data-name="Action"
						>
							<button
								type="button"
								class="relative flex w-full shrink-0 cursor-pointer content-stretch items-center justify-center gap-[6px] overflow-clip rounded-[10px] border border-solid border-[#171717] bg-[#171717] px-[16px] py-[8px] disabled:cursor-not-allowed disabled:opacity-60"
								data-name="Solid Button"
								disabled={placing || loading || !ready}
								onclick={placeOrder}
							>
								<div
									class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#fafafa]"
								>
									<p class="leading-[20px]">{placing ? 'Placing order...' : 'Place Order'}</p>
								</div>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<SiteFooter />
</div>

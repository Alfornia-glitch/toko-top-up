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

	const imgShoppingCart = '/assets/64b14.svg';
	const imgMapPin = '/assets/a58c0.svg';
	const imgDollarSign = '/assets/f6f6f.svg';
	const imgLeftIcon5 = '/assets/f848c.svg';
	const imgLeftIcon6 = '/assets/93584.svg';
	const imgRadio = '/assets/f64b2.svg';
	const imgRadioChecked = '/assets/402db.svg';
	const imgSeparator1 = '/assets/72948.svg';

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
	const shippingCents = $derived(selectedShipping?.priceCents ?? 0);
	const totalCents = $derived(cart.totalCents + shippingCents);

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

			error = cause instanceof Error ? cause.message : 'Could not load your addresses';
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
			formError = 'Please complete the required fields.';
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

			formError = cause instanceof Error ? cause.message : 'Could not save the address';
		} finally {
			submitting = false;
		}
	}

	async function continueToPayment() {
		error = '';

		if (!checkout.addressId) {
			error = 'Select a delivery address to continue.';
			return;
		}

		if (!checkout.shippingId) {
			error = 'Choose a delivery speed to continue.';
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
	class="relative flex size-full flex-col content-stretch items-center bg-white"
	data-name="Shopix - Address"
>
	<SiteHeader />
	<div
		class="relative flex w-full max-w-[1440px] shrink-0 flex-col content-stretch items-center justify-center bg-white py-[56px]"
		data-name="Checkout"
	>
		<div
			class="relative flex w-full max-w-[1280px] min-w-[328px] shrink-0 flex-col content-stretch items-start justify-center gap-[16px] px-[32px]"
			data-name="Flex Horizontal"
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
								class="relative flex size-[38px] shrink-0 flex-col content-stretch items-center justify-center rounded-[9999px] bg-white p-[8px]"
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

			{#if ready && cart.items.length === 0}
				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-center gap-[16px] rounded-[14px] border border-solid border-[#e5e5e5] bg-white p-[32px] text-center"
					data-name="Card"
				>
					<p
						class="relative font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold text-[#0a0a0a]"
					>
						Your cart is empty
					</p>
					<p class="relative font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
						Add items to your cart before continuing to checkout.
					</p>
					<a
						href="/cart"
						class="relative flex w-full max-w-[320px] shrink-0 cursor-pointer content-stretch items-center justify-center gap-[6px] overflow-clip rounded-[10px] border border-solid border-[#171717] bg-[#171717] px-[16px] py-[8px]"
						data-name="Solid Button"
					>
						<div
							class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#fafafa]"
						>
							<p class="leading-[20px]">Back to cart</p>
						</div>
					</a>
				</div>
			{:else}
				<div
					class="relative flex w-full shrink-0 content-stretch items-start gap-[16px]"
					data-name="Flex Horizontal"
				>
					<div
						class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[16px]"
						data-name="Flex Vertical"
					>
						<p
							class="relative h-[28px] w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
						>
							Select Delivery Address
						</p>

						{#if loadingAddresses}
							<p class="relative font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
								Loading your addresses...
							</p>
						{/if}

						{#each addresses as address (address.id)}
							<button
								type="button"
								class="relative flex w-full shrink-0 cursor-pointer content-stretch items-start overflow-clip rounded-[10px] border border-solid bg-white p-[12px] text-left {checkout.addressId ===
								address.id
									? 'border-[#171717]'
									: 'border-[#e5e5e5]'}"
								data-name="Card Radio"
								onclick={() => checkout.selectAddress(address.id)}
							>
								<div
									class="relative flex min-w-px flex-[1_0_0] content-stretch items-start gap-[10px]"
									data-name="Radio"
								>
									<div class="relative size-[24px] shrink-0" data-name="Radio">
										<img
											alt=""
											class="absolute inset-0 block size-full max-w-none"
											src={checkout.addressId === address.id ? imgRadioChecked : imgRadio}
										/>
									</div>
									<div
										class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start justify-center self-stretch"
										data-name="radio-container"
									>
										<div
											class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[14px]"
											data-name="Text"
										>
											<div
												class="relative flex w-full shrink-0 flex-wrap content-stretch items-center gap-[8px]"
												data-name="Header"
											>
												<p
													class="relative min-w-px flex-[1_0_0] font-['Geist:Medium'] text-[16px] leading-[24px] font-medium [word-break:break-word] text-[#0a0a0a]"
												>
													{address.recipientName}
												</p>
												{#if address.isDefaultShipping}
													<div
														class="relative flex h-[22px] shrink-0 content-stretch items-center justify-center gap-[4px] rounded-[8px] px-[8px] py-[2px]"
														style="background-image: linear-gradient(90deg, rgba(22, 163, 74, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)"
														data-name="Soft Badge"
													>
														<div
															class="relative flex shrink-0 flex-col justify-center text-center font-['Geist:Medium'] text-[12px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#16a34a]"
														>
															<p class="leading-[16px]">Default</p>
														</div>
													</div>
												{/if}
												{#if address.label}
													<div
														class="relative flex h-[22px] shrink-0 content-stretch items-center justify-center gap-[4px] rounded-[8px] px-[8px] py-[2px]"
														style="background-image: linear-gradient(90deg, rgba(2, 132, 199, 0.1) 0%, rgba(2, 132, 199, 0.1) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)"
														data-name="Soft Badge"
													>
														<div
															class="relative flex shrink-0 flex-col justify-center text-center font-['Geist:Medium'] text-[12px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#0284c7]"
														>
															<p class="leading-[16px]">{address.label}</p>
														</div>
													</div>
												{/if}
											</div>
											<div
												class="relative flex w-full shrink-0 flex-col content-stretch items-start justify-center gap-[8px]"
												data-name="content"
											>
												<div
													class="relative w-full shrink-0 font-['Geist:Regular'] text-[14px] leading-[0] font-normal [word-break:break-word] whitespace-pre-wrap text-[#737373]"
												>
													<p class="mb-0 leading-[20px]">{address.line1}</p>
													{#if address.line2}
														<p class="mb-0 leading-[20px]">{address.line2}</p>
													{/if}
													<p class="leading-[20px]">
														{[address.city, address.region, address.postalCode, address.country]
															.filter(Boolean)
															.join(', ')}
													</p>
												</div>
												{#if address.phone}
													<div
														class="relative flex w-full shrink-0 content-stretch items-center gap-[8px]"
														data-name="contact"
													>
														<div class="relative size-[14px] shrink-0" data-name="Left-icon">
															<img
																alt=""
																class="absolute inset-0 block size-full max-w-none"
																src={imgLeftIcon5}
															/>
														</div>
														<p
															class="relative shrink-0 font-['Geist:Regular'] text-[14px] leading-[20px] font-normal [word-break:break-word] whitespace-nowrap text-[#737373]"
														>
															{address.phone}
														</p>
													</div>
												{/if}
											</div>
										</div>
									</div>
								</div>
							</button>
						{/each}

						{#if !loadingAddresses && addresses.length === 0}
							<p class="relative font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
								You have no saved addresses yet. Add one below.
							</p>
						{/if}

						{#if error}
							<p class="relative font-['Geist:Regular'] text-[14px] leading-[20px] text-red-600">
								{error}
							</p>
						{/if}

						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px]"
							data-name="Flex Vertical"
						>
							<p
								class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
							>
								Choose a delivery speed
							</p>
							<div
								class="relative flex w-full shrink-0 flex-wrap content-start items-start gap-[12px]"
								data-name="Flex Horizontal"
							>
								{#each site.shipping as option (option.id)}
									<button
										type="button"
										class="relative flex shrink-0 cursor-pointer content-stretch items-start gap-[8px] text-left"
										data-name="Radio"
										onclick={() => checkout.selectShipping(option.id)}
									>
										<div class="relative size-[24px] shrink-0" data-name="Radio">
											<img
												alt=""
												class="absolute inset-0 block size-full max-w-none"
												src={checkout.shippingId === option.id ? imgRadioChecked : imgRadio}
											/>
										</div>
										<div
											class="relative flex shrink-0 flex-col content-stretch items-start justify-center gap-[4px] self-stretch"
											data-name="Text"
										>
											<div
												class="relative flex w-full shrink-0 content-stretch items-start gap-[4px]"
											>
												<div
													class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
												>
													<p class="leading-[20px]">{option.label}</p>
												</div>
												<div
													class="relative flex h-[20px] shrink-0 content-stretch items-center justify-center gap-[2px] rounded-[8px] px-[6px] py-[2px]"
													style="background-image: linear-gradient(90deg, rgba(2, 132, 199, 0.1) 0%, rgba(2, 132, 199, 0.1) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)"
													data-name="Soft Badge"
												>
													<div
														class="relative flex shrink-0 flex-col justify-center text-center font-['Geist:Medium'] text-[12px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#0284c7]"
													>
														<p class="leading-[16px]">
															{formatMoney(option.priceCents, cart.currency)}
														</p>
													</div>
												</div>
											</div>
											<p
												class="relative h-[20px] w-full shrink-0 font-['Geist:Regular'] text-[14px] leading-[20px] font-normal [word-break:break-word] text-[#737373]"
											>
												{option.description}
											</p>
											<p
												class="relative w-full shrink-0 font-['Geist:Regular'] text-[12px] leading-[16px] font-normal [word-break:break-word] text-[#737373]"
											>
												{option.minDays}-{option.maxDays} days
											</p>
										</div>
									</button>
								{/each}
							</div>
							{#if site.shipping.length === 0}
								<p
									class="relative font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]"
								>
									Delivery options are unavailable right now.
								</p>
							{/if}
						</div>

						<form
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] rounded-[8px] border border-solid border-[#e5e5e5] bg-[#f5f5f5] p-[16px]"
							data-name="Flex Vertical"
							onsubmit={submitAddress}
						>
							<div
								class="relative flex w-full shrink-0 content-stretch items-center gap-[4px]"
								data-name="Flex Horizontal"
							>
								<div class="relative size-[27px] shrink-0" data-name="Left-icon">
									<img
										alt=""
										class="absolute inset-0 block size-full max-w-none"
										src={imgLeftIcon6}
									/>
								</div>
								<div
									class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[20px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
								>
									<p class="leading-[28px]">Add new Address</p>
								</div>
							</div>

							<div class="grid w-full gap-[12px] sm:grid-cols-2">
								<label class="grid gap-[6px]">
									<span
										class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
										>Label</span
									>
									<input
										class="h-[32px] w-full rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a] outline-none focus:border-[#171717]"
										bind:value={form.label}
										autocomplete="organization"
									/>
								</label>
								<label class="grid gap-[6px]">
									<span
										class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
										>Recipient name</span
									>
									<input
										class="h-[32px] w-full rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a] outline-none focus:border-[#171717]"
										bind:value={form.recipientName}
										autocomplete="name"
										required
									/>
								</label>
								<label class="grid gap-[6px]">
									<span
										class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
										>Phone</span
									>
									<input
										class="h-[32px] w-full rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a] outline-none focus:border-[#171717]"
										bind:value={form.phone}
										autocomplete="tel"
									/>
								</label>
								<label class="grid gap-[6px]">
									<span
										class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
										>Country</span
									>
									<input
										class="h-[32px] w-full rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a] outline-none focus:border-[#171717]"
										bind:value={form.country}
										autocomplete="country-name"
										required
									/>
								</label>
								<label class="grid gap-[6px] sm:col-span-2">
									<span
										class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
										>Address line 1</span
									>
									<input
										class="h-[32px] w-full rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a] outline-none focus:border-[#171717]"
										bind:value={form.line1}
										autocomplete="address-line1"
										required
									/>
								</label>
								<label class="grid gap-[6px] sm:col-span-2">
									<span
										class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
										>Address line 2</span
									>
									<input
										class="h-[32px] w-full rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a] outline-none focus:border-[#171717]"
										bind:value={form.line2}
										autocomplete="address-line2"
									/>
								</label>
								<label class="grid gap-[6px]">
									<span
										class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
										>City</span
									>
									<input
										class="h-[32px] w-full rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a] outline-none focus:border-[#171717]"
										bind:value={form.city}
										autocomplete="address-level2"
										required
									/>
								</label>
								<label class="grid gap-[6px]">
									<span
										class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
										>Region</span
									>
									<input
										class="h-[32px] w-full rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a] outline-none focus:border-[#171717]"
										bind:value={form.region}
										autocomplete="address-level1"
									/>
								</label>
								<label class="grid gap-[6px]">
									<span
										class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
										>Postal code</span
									>
									<input
										class="h-[32px] w-full rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a] outline-none focus:border-[#171717]"
										bind:value={form.postalCode}
										autocomplete="postal-code"
									/>
								</label>
							</div>

							<div class="flex w-full flex-col gap-[8px]">
								<label
									class="flex items-center gap-[8px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a]"
								>
									<input
										type="checkbox"
										class="size-[16px] rounded-[4px] border border-solid border-[#e5e5e5]"
										bind:checked={form.isDefaultShipping}
									/>
									<span>Set as default shipping address</span>
								</label>
								<label
									class="flex items-center gap-[8px] font-['Geist:Regular'] text-[14px] leading-[20px] text-[#0a0a0a]"
								>
									<input
										type="checkbox"
										class="size-[16px] rounded-[4px] border border-solid border-[#e5e5e5]"
										bind:checked={form.isDefaultBilling}
									/>
									<span>Set as default billing address</span>
								</label>
							</div>

							{#if formError}
								<p class="relative font-['Geist:Regular'] text-[14px] leading-[20px] text-red-600">
									{formError}
								</p>
							{/if}

							<button
								type="submit"
								class="relative flex shrink-0 cursor-pointer content-stretch items-center justify-center gap-[6px] overflow-clip rounded-[10px] border border-solid border-[#171717] bg-[#171717] px-[16px] py-[8px] disabled:cursor-not-allowed disabled:opacity-60"
								data-name="Solid Button"
								disabled={submitting}
							>
								<div
									class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#fafafa]"
								>
									<p class="leading-[20px]">{submitting ? 'Saving...' : 'Save address'}</p>
								</div>
							</button>
						</form>
					</div>

					<div
						class="relative flex max-w-[522px] min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[24px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
						data-name="Flex Vertical"
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
									<img alt="" class="block size-full max-w-none" src={imgSeparator1} />
								</div>
							</div>
							<div
								class="relative flex w-full shrink-0 content-stretch items-start gap-[24px] text-[18px] leading-[28px] [word-break:break-word] text-[#0a0a0a]"
								data-name="Total Payable"
							>
								<p class="relative min-w-px flex-[1_0_0] font-['Geist:Medium'] font-medium">
									Total Payable
								</p>
								<p
									class="relative shrink-0 font-['Geist:SemiBold'] font-semibold whitespace-nowrap"
								>
									{formatMoney(totalCents, cart.currency)}
								</p>
							</div>
							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-start"
								data-name="Action"
							>
								<button
									type="button"
									class="relative flex w-full shrink-0 cursor-pointer content-stretch items-center justify-center gap-[6px] overflow-clip rounded-[10px] border border-solid border-[#171717] bg-[#171717] px-[16px] py-[8px]"
									data-name="Solid Button"
									onclick={continueToPayment}
								>
									<div
										class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#fafafa]"
									>
										<p class="leading-[20px]">Continue Payment</p>
									</div>
								</button>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
	<SiteFooter />
</div>

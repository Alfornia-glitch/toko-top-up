<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { X } from '@lucide/svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import Minus from '#lib/frontend/components/ui/Minus.svelte';
	import Plus from '#lib/frontend/components/ui/Plus.svelte';
	import { cart } from '#lib/frontend/modules/commerce/cart.svelte.ts';
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';

	const imgShoppingCart = '/assets/64b14.svg';
	const imgMapPin = '/assets/9a249.svg';
	const imgDollarSign = '/assets/f6f6f.svg';
	const imgLeftIcon5 = '/assets/c356a.svg';
	const imgSeparator = '/assets/72948.svg';
	const imgOfferPopSvg = '/assets/97856.svg';

	let couponCode = $state('');
	let couponError = $state('');

	onMount(() => {
		void cart.refresh();
	});

	const itemLabel = $derived(cart.count === 1 ? 'item' : 'items');
	const discountAmount = $derived(cart.discountCents > 0 ? -cart.discountCents : 0);
	const shippingCents = $derived(cart.cart?.shippingCents ?? 0);
	const shippingLabel = $derived(
		shippingCents > 0 ? formatMoney(shippingCents, cart.currency) : 'Calculated at checkout'
	);

	async function applyCoupon() {
		const code = couponCode.trim();

		if (!code) {
			couponError = 'Enter a coupon code.';
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
	class="relative flex size-full flex-col content-stretch items-center bg-white"
	data-name="Shopix - Cart"
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
				class="relative flex h-[136px] w-full shrink-0 flex-col content-stretch items-center rounded-[8px] bg-[#f5f5f5] pt-[32px]"
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
								class="relative flex size-[38px] shrink-0 flex-col content-stretch items-center justify-center rounded-[9999px] bg-white p-[8px]"
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

			{#if cart.loading && !cart.cart}
				<div class="flex w-full flex-col gap-[16px]" aria-busy="true" aria-live="polite">
					<div class="flex flex-col gap-[16px] lg:flex-row lg:items-start">
						<div class="flex w-full flex-col gap-[16px] lg:w-[678px]">
							{#each [0, 1] as index (index)}
								<div
									class="h-[220px] w-full animate-pulse rounded-[14px] bg-[#f5f5f5]"
									data-name="Card"
								></div>
							{/each}
						</div>
						<div
							class="h-[320px] w-full animate-pulse rounded-[14px] bg-[#f5f5f5] lg:w-[522px]"
							data-name="Flex Vertical"
						></div>
					</div>
				</div>
			{:else}
				{#if cart.error}
					<div
						class="w-full rounded-[8px] border border-solid border-[#fecaca] bg-[#fef2f2] px-[16px] py-[12px] font-['Geist:Regular'] text-[14px] leading-[20px] font-normal text-[#b91c1c]"
						role="alert"
					>
						{cart.error}
					</div>
				{/if}

				{#if cart.loading}
					<p
						class="w-full text-right font-['Geist:Regular'] text-[12px] leading-[16px] font-normal text-[#737373]"
						aria-live="polite"
					>
						Updating cart…
					</p>
				{/if}

				<div
					class="relative flex w-full shrink-0 content-stretch items-start gap-[16px]"
					data-name="Flex Horizontal"
				>
					<div
						class="relative flex w-[678px] min-w-[300px] shrink-0 flex-col content-stretch items-start gap-[16px]"
						data-name="Flex Vertical"
					>
						<a
							href="/products"
							class="relative flex w-full shrink-0 content-stretch items-center justify-center rounded-[8px] border border-solid border-[#e5e5e5] bg-white py-[12px] transition hover:bg-[#fafafa]"
							data-name="Flex Horizontal"
						>
							<div
								class="relative flex min-w-px flex-[1_0_0] content-stretch items-center justify-between px-[24px]"
								data-name="Flex Horizontal"
							>
								<p
									class="relative shrink-0 font-['Geist:Medium'] text-[20px] leading-[28px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
								>
									Add more from Wishlist
								</p>
								<div class="relative size-[27px] shrink-0" data-name="Left-icon">
									<img
										alt=""
										class="absolute inset-0 block size-full max-w-none"
										src={imgLeftIcon5}
									/>
								</div>
							</div>
						</a>

						{#if cart.items.length === 0}
							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center gap-[16px] rounded-[14px] bg-[#f5f5f5] px-[24px] py-[48px] text-center"
								data-name="Card"
							>
								<p
									class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold text-[#0a0a0a]"
								>
									Your cart is empty
								</p>
								<p
									class="relative w-full shrink-0 font-['Geist:Regular'] text-[14px] leading-[20px] font-normal text-[#737373]"
								>
									Add products to your cart to continue to checkout.
								</p>
								<div class="flex flex-wrap items-center justify-center gap-[12px]">
									<a
										href="/products"
										class="inline-flex items-center justify-center rounded-[10px] border border-solid border-[#171717] bg-[#171717] px-[16px] py-[8px] font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#fafafa] transition hover:bg-[#262626]"
									>
										Browse products
									</a>
									<a
										href="/cart/empty"
										class="inline-flex items-center justify-center rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[16px] py-[8px] font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a] transition hover:bg-[#fafafa]"
									>
										View empty cart
									</a>
								</div>
							</div>
						{:else}
							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px]"
								data-name="Flex Vertical"
							>
								{#each cart.items as item (item.id)}
									<div
										class="relative flex w-full shrink-0 flex-col content-stretch items-start"
										data-name="lisitng Product Card"
									>
										<div
											class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
											data-name="Card"
										>
											<div
												class="relative flex w-full shrink-0 flex-col content-stretch items-start"
												data-name="card-body"
											>
												<div class="relative flex w-full shrink-0 content-stretch items-start">
													<div
														class="relative flex w-[240px] shrink-0 flex-col content-stretch items-center justify-center self-stretch rounded-tl-[8px] rounded-bl-[8px] bg-[#f5f5f5] p-[16px] max-sm:w-[132px]"
														data-name="Product Image"
													>
														{#if item.imageUrl}
															<img
																src={item.imageUrl}
																alt={item.productName}
																loading="lazy"
																class="h-[262px] w-full object-contain max-sm:h-[150px]"
															/>
														{:else}
															<ImagePlaceholder
																class="h-[262px] w-full rounded-[8px] max-sm:h-[150px]"
																label={item.productName}
															/>
														{/if}
													</div>
													<div
														class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[12px] py-[16px]"
														data-name="Flex Vertical"
													>
														<div
															class="relative flex w-full shrink-0 content-stretch items-start justify-between gap-[12px] px-[16px]"
															data-name="Flex Horizontal"
														>
															<div
																class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[4px] [word-break:break-word]"
																data-name="Product details"
															>
																{#if item.brandName}
																	<p
																		class="relative w-full shrink-0 font-['Geist:Medium'] text-[12px] leading-[16px] font-medium tracking-wide text-[#737373] uppercase"
																	>
																		{item.brandName}
																	</p>
																{/if}
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
															</div>
															<button
																type="button"
																class="flex size-[28px] shrink-0 items-center justify-center rounded-full text-[#737373] transition hover:bg-[#f5f5f5] hover:text-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-40"
																aria-label={`Remove ${item.productName} from cart`}
																onclick={() => void cart.remove(item.id)}
																disabled={cart.loading}
															>
																<X class="size-[18px]" />
															</button>
														</div>
														<div
															class="relative flex w-full shrink-0 content-stretch items-center gap-[6px] px-[16px] whitespace-nowrap"
															data-name="Flex Horizontal"
														>
															<p
																class="relative shrink-0 font-['Geist:SemiBold'] text-[16px] leading-[24px] font-semibold text-[#0a0a0a]"
															>
																{formatMoney(item.unitPriceCents, cart.currency)}
															</p>
															{#if item.compareAtPriceCents && item.compareAtPriceCents > item.unitPriceCents}
																<p
																	class="relative shrink-0 font-['Geist:Regular'] text-[14px] leading-[20px] font-normal text-[#737373] line-through"
																>
																	{formatMoney(item.compareAtPriceCents, cart.currency)}
																</p>
															{/if}
														</div>
														<div
															class="relative flex w-full shrink-0 flex-wrap content-stretch items-center justify-between gap-[12px] px-[16px]"
															data-name="Flex Horizontal"
														>
															<div
																class="flex items-center gap-[6px] rounded-[8px] border border-solid border-[#e5e5e5] bg-white px-[8px] py-[4px]"
																data-name="input number"
															>
																<button
																	type="button"
																	class="flex size-[20px] shrink-0 items-center justify-center rounded-[4px] bg-[#f5f5f5] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-40"
																	aria-label={`Decrease quantity of ${item.productName}`}
																	onclick={() => void cart.update(item.id, item.quantity - 1)}
																	disabled={cart.loading || item.quantity <= 1}
																>
																	<Minus class="relative size-[12px]" />
																</button>
																<span
																	class="min-w-[24px] text-center font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
																	aria-live="polite"
																>
																	{item.quantity}
																</span>
																<button
																	type="button"
																	class="flex size-[20px] shrink-0 items-center justify-center rounded-[4px] bg-[#f5f5f5] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-40"
																	aria-label={`Increase quantity of ${item.productName}`}
																	onclick={() => void cart.update(item.id, item.quantity + 1)}
																	disabled={cart.loading || item.quantity >= item.stock}
																>
																	<Plus class="relative size-[12px]" />
																</button>
															</div>
															<div class="flex items-baseline gap-[6px] whitespace-nowrap">
																<span
																	class="font-['Geist:Regular'] text-[12px] leading-[16px] font-normal text-[#737373]"
																>
																	Line total
																</span>
																<p
																	class="font-['Geist:SemiBold'] text-[16px] leading-[24px] font-semibold text-[#0a0a0a]"
																>
																	{formatMoney(item.unitPriceCents * item.quantity, cart.currency)}
																</p>
															</div>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<div
						class="relative flex w-[522px] shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[24px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
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
									{itemLabel} in your cart
								</p>
							</div>

							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center"
								data-name="Flex Vertical"
							>
								<div
									class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[10px] rounded-[8px] border border-solid border-[#e5e5e5] bg-[#f5f5f5] p-[10px]"
									data-name="Flex Vertical"
								>
									<div
										class="relative flex w-full shrink-0 content-stretch items-center justify-between"
										data-name="Flex Horizontal"
									>
										<div
											class="relative flex min-w-px flex-[1_0_0] content-stretch items-center gap-[4px]"
											data-name="Flex Horizontal"
										>
											<div
												class="relative flex shrink-0 flex-col justify-center font-['Geist:SemiBold'] text-[14px] leading-[0] font-semibold [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
											>
												<p class="leading-[20px]">Coupon Code</p>
											</div>
											<div class="relative size-[25px] shrink-0" data-name="offer-pop.svg">
												<img
													alt=""
													class="absolute inset-0 block size-full max-w-none"
													src={imgOfferPopSvg}
												/>
											</div>
										</div>
									</div>

									{#if cart.cart?.coupon}
										<div
											class="flex w-full items-center justify-between gap-[8px] rounded-[6px] bg-white px-[14px] py-[10px]"
										>
											<p
												class="font-['Geist:Medium'] text-[12px] leading-[16px] font-medium text-[#16a34a]"
											>
												{cart.cart?.coupon?.code}
											</p>
											<button
												type="button"
												class="font-['Geist:Medium'] text-[12px] leading-[16px] font-medium text-[#737373] underline-offset-2 transition hover:text-[#0a0a0a] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
												onclick={() => void cart.removeCoupon()}
												disabled={cart.loading}
											>
												Remove
											</button>
										</div>
									{:else}
										<form
											class="flex w-full items-center gap-[8px]"
											onsubmit={(event) => {
												event.preventDefault();
												void applyCoupon();
											}}
										>
											<Input
												bind:value={couponCode}
												placeholder="Add discount code"
												aria-label="Coupon code"
												autocomplete="off"
												class="h-[36px] rounded-[6px] border-[#e5e5e5] bg-white text-[12px] text-[#0a0a0a] placeholder:text-[#737373]"
												disabled={cart.loading}
												oninput={() => (couponError = '')}
											/>
											<Button
												type="submit"
												class="h-[36px] shrink-0 rounded-[6px] bg-[#171717] px-[16px] text-[12px] text-[#fafafa] hover:bg-[#262626]"
												disabled={cart.loading || couponCode.trim().length === 0}
											>
												Apply
											</Button>
										</form>
									{/if}

									{#if couponError}
										<p
											class="w-full font-['Geist:Regular'] text-[12px] leading-[16px] font-normal text-[#dc2626]"
											role="alert"
										>
											{couponError}
										</p>
									{/if}
								</div>
							</div>

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
										{shippingLabel}
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
										{formatMoney(discountAmount, cart.currency)}
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
								<p
									class="relative shrink-0 font-['Geist:SemiBold'] font-semibold whitespace-nowrap"
								>
									{formatMoney(cart.totalCents, cart.currency)}
								</p>
							</div>

							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-start"
								data-name="Action"
							>
								<button
									type="button"
									class="relative flex w-full shrink-0 cursor-pointer content-stretch items-center justify-center gap-[6px] overflow-clip rounded-[10px] border border-solid border-[#171717] bg-[#171717] px-[16px] py-[8px] transition hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-50"
									data-name="Solid Button"
									onclick={() => goto('/checkout/address')}
									disabled={cart.items.length === 0 || cart.loading}
								>
									<div
										class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#fafafa]"
									>
										<p class="leading-[20px]">Continue</p>
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

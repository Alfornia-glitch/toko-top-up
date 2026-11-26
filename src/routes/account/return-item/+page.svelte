<script lang="ts">
	import {
		listOrders,
		getOrder,
		createReturn,
		isUnauthorized,
		type ReturnItemForm,
		messageFrom
	} from '#lib/frontend/modules/account/index.ts';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AccountSidebar from '#lib/frontend/components/AccountSidebar.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as RadioGroup from '#lib/frontend/components/ui/radio-group/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';
	import {
		ORDER_STATUS_LABELS,
		RETURN_STATUS_LABELS,
		statusLabel
	} from '#lib/frontend/content/status.ts';
	import { formatDate, formatMoney } from '#lib/frontend/modules/commerce/format.ts';

	import type {
		OrderDetail,
		OrderSummary,
		ReturnDetail
	} from '#lib/frontend/modules/commerce/models.ts';

	const reasonOptions = [
		'Wrong size',
		'Defective/damaged item',
		'Wrong item received',
		'Don’t like the product',
		'Other'
	];

	const resolutionOptions = [
		{ value: 'none', label: 'No preference' },
		{ value: 'original_payment', label: 'Original payment method' },
		{ value: 'gift_card', label: 'Gift card' },
		{ value: 'card', label: 'Credit or Debit card' }
	];

	let orders = $state<OrderSummary[]>([]);
	let selectedOrder = $state<OrderDetail | null>(null);
	let selectedOrderNumber = $state('');
	let created = $state<ReturnDetail | null>(null);
	let loading = $state(true);
	let orderLoading = $state(false);
	let submitting = $state(false);
	let error = $state('');
	let formError = $state('');
	let form = $state<ReturnItemForm>({
		orderItemId: '',
		reason: '',
		note: '',
		resolution: 'none'
	});

	function redirectToLogin() {
		const target = `${page.url.pathname}${page.url.search}`;
		void goto(`/login?redirectTo=${encodeURIComponent(target)}`, { replaceState: true });
	}

	function redirectIfUnauthorized(cause: unknown): boolean {
		if (isUnauthorized(cause)) {
			redirectToLogin();
			return true;
		}

		return false;
	}

	function errorMessage(cause: unknown, fallback: string): string {
		return messageFrom(cause, fallback);
	}

	async function selectOrder(value: string) {
		selectedOrderNumber = value;
		selectedOrder = null;
		form.orderItemId = '';
		formError = '';

		if (!value) return;

		orderLoading = true;

		try {
			selectedOrder = await getOrder(value);

			if (selectedOrder.items.length > 0) {
				form.orderItemId = selectedOrder.items[0].id;
			}
		} catch (cause) {
			if (!redirectIfUnauthorized(cause)) {
				formError = errorMessage(cause, 'Could not load the items for this order');
			}
		} finally {
			orderLoading = false;
		}
	}

	async function initialize() {
		loading = true;
		error = '';

		try {
			orders = (await listOrders(1, 50)).data;

			if (orders.length > 0) await selectOrder(orders[0].orderNumber);
		} catch (cause) {
			if (!redirectIfUnauthorized(cause)) {
				error = errorMessage(cause, 'Could not load your orders');
			}
		} finally {
			loading = false;
		}
	}

	async function submitReturn(event: SubmitEvent) {
		event.preventDefault();
		formError = '';

		if (!form.orderItemId) {
			formError = 'Select the item you want to return.';
			return;
		}

		if (!form.reason.trim()) {
			formError = 'Tell us why you want to return this item.';
			return;
		}

		submitting = true;

		try {
			created = await createReturn({
				orderItemId: form.orderItemId,
				type: 'return',
				reason: form.reason.trim(),
				note: form.note.trim() || null,
				resolution: form.resolution === 'none' ? null : form.resolution
			});
		} catch (cause) {
			if (!redirectIfUnauthorized(cause)) {
				formError = errorMessage(cause, 'Could not submit your return request');
			}
		} finally {
			submitting = false;
		}
	}

	function startAnother() {
		created = null;
		form = { orderItemId: '', reason: '', note: '', resolution: 'none' };
		if (selectedOrder && selectedOrder.items.length > 0) {
			form.orderItemId = selectedOrder.items[0].id;
		}
	}

	onMount(() => {
		void initialize();
	});
</script>

<div
	class="relative flex size-full flex-col content-stretch items-center bg-white"
	data-name="Shopix - Return"
>
	<SiteHeader />
	<div
		class="relative flex w-full max-w-[1440px] shrink-0 flex-col content-stretch items-center justify-center bg-white py-[56px] max-[480px]:py-9"
		data-name="Product details"
	>
		<div
			class="relative flex w-full max-w-[1280px] min-w-[328px] shrink-0 content-stretch items-start gap-[24px] px-[32px] max-[480px]:px-3.5"
			data-name="Flex Horizontal"
		>
			<AccountSidebar />

			<div
				class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[24px]"
				data-name="Flex Vertical"
			>
				{#if loading}
					<div
						class="relative flex w-full items-center justify-center gap-3 rounded-[14px] bg-white px-[24px] py-[64px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
						data-name="Card"
					>
						<Spinner class="size-5" aria-label="Loading orders" />
						<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
							Loading orders
						</p>
					</div>
				{:else if error}
					<div
						class="relative flex w-full rounded-[14px] border border-[#fecaca] bg-[#fef2f2] px-[24px] py-[16px] text-[#b91c1c]"
						data-name="Card"
						role="alert"
					>
						{error}
					</div>
				{:else if orders.length === 0}
					<div
						class="relative flex w-full flex-col items-start gap-[12px] rounded-[14px] bg-white px-[24px] py-[32px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
						data-name="Card"
					>
						<p
							class="font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold text-[#0a0a0a]"
						>
							No orders yet
						</p>
						<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
							You need an order before you can request a return.
						</p>
						<a
							href="/products"
							class="rounded-[8px] bg-[#171717] px-[16px] py-[10px] font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#fafafa]"
						>
							Browse products
						</a>
					</div>
				{:else if created}
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[24px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
						data-name="Card"
					>
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[12px] px-[24px]"
							data-name="card-body"
						>
							<p
								class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
							>
								Return requested
							</p>
							<div class="flex w-full flex-wrap items-center gap-[8px]">
								<Badge variant="outline">
									{statusLabel(RETURN_STATUS_LABELS, created.status)}
								</Badge>
								<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
									Order #{created.orderNumber}
								</p>
							</div>
							<div class="flex w-full flex-col gap-[4px]">
								<p
									class="font-['Geist:Medium'] text-[18px] leading-[28px] font-medium text-[#0a0a0a]"
								>
									{created.productName}
								</p>
								<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
									SKU: {created.sku}
								</p>
								<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
									{created.reason}
								</p>
							</div>
							<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
								We will contact you once the return is approved.
							</p>
							<div class="flex flex-wrap items-center gap-[12px]">
								<Button href="/account/returns-refunds" data-name="Solid Button">
									View returns &amp; refunds
								</Button>
								<Button variant="outline" onclick={startAnother}>Request another</Button>
							</div>
						</div>
					</div>
				{:else}
					<form class="flex w-full flex-col gap-[24px]" onsubmit={submitReturn}>
						<div
							class="relative isolate flex w-full shrink-0 content-stretch items-start"
							data-name="Advance Tabs"
						>
							<div
								class="relative z-[1] flex min-w-px flex-[1_0_0] content-stretch items-center gap-[4px]"
								data-name="Items"
							>
								<a
									href="/account/exchange"
									class="relative flex h-[34px] min-w-px flex-[1_0_0] content-stretch items-center justify-center gap-[4px] px-[10px] pt-[6px] pb-[8px]"
									data-name="Tab item"
								>
									<p
										class="relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a] opacity-60"
									>
										Exchange
									</p>
								</a>
								<a
									href="/account/return-item"
									class="relative flex h-[34px] min-w-px flex-[1_0_0] content-stretch items-center justify-center gap-[4px] border-b-2 border-solid border-[#0a0a0a] bg-white px-[10px] pt-[6px] pb-[8px]"
									data-name="Tab item"
								>
									<p
										class="relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
									>
										Return
									</p>
								</a>
							</div>
						</div>

						{#if orders.length > 1}
							<div class="flex w-full flex-col gap-[6px] sm:max-w-[320px]">
								<Label for="return-order">Order</Label>
								<Select.Root type="single" value={selectedOrderNumber} onValueChange={selectOrder}>
									<Select.Trigger id="return-order" class="w-full">
										<Select.Value placeholder="Select an order" />
									</Select.Trigger>
									<Select.Content>
										{#each orders as entry (entry.id)}
											<Select.Item value={entry.orderNumber} label={entry.orderNumber}>
												{entry.orderNumber}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						{/if}

						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
							data-name="Card"
						>
							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] px-[16px] py-[16px]"
								data-name="card-body"
							>
								{#if selectedOrder}
									<div
										class="relative flex w-full shrink-0 flex-wrap content-stretch items-center justify-between gap-[12px]"
										data-name="Flex Horizontal"
									>
										<div class="flex flex-col gap-[2px]">
											<p
												class="relative font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] text-[#171717]"
											>
												Order #{selectedOrder.orderNumber}
											</p>
											<p class="font-['Geist:Regular'] text-[12px] leading-[16px] text-[#737373]">
												{formatDate(selectedOrder.placedAt)}
											</p>
										</div>
										<Badge variant="outline">
											{statusLabel(ORDER_STATUS_LABELS, selectedOrder.status)}
										</Badge>
									</div>

									{#if orderLoading}
										<div class="flex items-center gap-[12px]">
											<Spinner class="size-5" aria-label="Loading order items" />
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
												Loading items
											</p>
										</div>
									{:else if selectedOrder.items.length === 0}
										<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
											This order has no items to return.
										</p>
									{:else}
										<RadioGroup.Root
											bind:value={form.orderItemId}
											class="flex w-full flex-col gap-[12px]"
										>
											{#each selectedOrder.items as item (item.id)}
												<label
													class="relative flex w-full cursor-pointer content-stretch items-center gap-[16px] rounded-[8px] border border-solid border-[#e5e5e5] p-[12px]"
													data-name="Flex Horizontal"
												>
													<RadioGroup.Item value={item.id} aria-label={item.productName} />
													<div
														class="relative flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[#f5f5f5]"
														data-name="Product Image"
													>
														{#if item.imageUrl}
															<img
																loading="lazy"
																decoding="async"
																alt={item.productName}
																class="size-full object-cover"
																src={item.imageUrl}
															/>
														{:else}
															<span
																class="text-center font-['Geist:Regular'] text-[12px] leading-[16px] text-[#737373]"
															>
																No image
															</span>
														{/if}
													</div>
													<div class="min-w-0 flex-1">
														<p
															class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-[#0a0a0a]"
														>
															{item.productName}
														</p>
														<p
															class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]"
														>
															SKU: {item.sku}
														</p>
														<p
															class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]"
														>
															Qty: {item.quantity} · {formatMoney(
																item.unitPrice,
																selectedOrder.currency
															)}
														</p>
													</div>
													<p
														class="shrink-0 font-['Geist:SemiBold'] text-[14px] leading-[20px] font-semibold text-[#0a0a0a]"
													>
														{formatMoney(item.total, selectedOrder.currency)}
													</p>
												</label>
											{/each}
										</RadioGroup.Root>

										<div
											class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[8px] rounded-[8px] bg-[#f5f5f5] p-[16px] max-md:max-w-full"
											data-name="Pricing Details"
										>
											<div class="flex w-full items-center justify-between gap-[12px]">
												<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
													Subtotal
												</p>
												<p
													class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-[#0a0a0a]"
												>
													{formatMoney(selectedOrder.subtotal, selectedOrder.currency)}
												</p>
											</div>
											<div class="flex w-full items-center justify-between gap-[12px]">
												<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
													Discount
												</p>
												<p
													class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-[#0a0a0a]"
												>
													−{formatMoney(selectedOrder.discount, selectedOrder.currency)}
												</p>
											</div>
											<div class="flex w-full items-center justify-between gap-[12px]">
												<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
													Shipment cost
												</p>
												<p
													class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-[#0a0a0a]"
												>
													{formatMoney(selectedOrder.shipping, selectedOrder.currency)}
												</p>
											</div>
											<div
												class="flex w-full items-center justify-between gap-[12px] border-t border-[#e5e5e5] pt-[8px]"
											>
												<p
													class="font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold text-[#0a0a0a]"
												>
													Grand Total
												</p>
												<p
													class="font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold text-[#0a0a0a]"
												>
													{formatMoney(selectedOrder.grandTotal, selectedOrder.currency)}
												</p>
											</div>
										</div>
									{/if}
								{/if}
							</div>
						</div>

						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
							data-name="Card"
						>
							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] px-[16px]"
								data-name="card-body"
							>
								<p
									class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
								>
									Why do you want to Return this item?
								</p>
								<RadioGroup.Root
									bind:value={form.reason}
									class="flex w-full flex-wrap items-start gap-[16px]"
								>
									{#each reasonOptions as option (option)}
										<label
											class="relative flex shrink-0 cursor-pointer content-stretch items-start gap-[10px]"
											data-name="Radio"
										>
											<RadioGroup.Item value={option} />
											<span
												class="relative flex shrink-0 flex-col content-stretch items-start justify-center gap-[2px] self-stretch font-['Geist:Regular'] text-[14px] leading-[20px] font-normal [word-break:break-word] text-[#0a0a0a]"
												data-name="radio-container"
											>
												{option}
											</span>
										</label>
									{/each}
								</RadioGroup.Root>
							</div>
						</div>

						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[6px]"
							data-name="Message Container"
						>
							<Label for="return-note" class="text-[16px] leading-[24px] font-medium">
								Note (optional)
							</Label>
							<Textarea
								id="return-note"
								bind:value={form.note}
								placeholder="Anything else we should know about this return?"
							/>
						</div>

						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
							data-name="Card"
						>
							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] px-[16px]"
								data-name="card-body"
							>
								<p
									class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
								>
									How do you want to be refunded?
								</p>
								<RadioGroup.Root
									bind:value={form.resolution}
									class="flex w-full flex-wrap items-start gap-[16px]"
								>
									{#each resolutionOptions as option (option.value)}
										<label
											class="relative flex shrink-0 cursor-pointer content-stretch items-start gap-[10px]"
											data-name="Radio"
										>
											<RadioGroup.Item value={option.value} />
											<span
												class="relative flex shrink-0 flex-col content-stretch items-start justify-center gap-[2px] self-stretch font-['Geist:Regular'] text-[14px] leading-[20px] font-normal [word-break:break-word] text-[#0a0a0a]"
												data-name="radio-container"
											>
												{option.label}
											</span>
										</label>
									{/each}
								</RadioGroup.Root>
							</div>
						</div>

						<p
							class="relative w-full shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-[#16a34a]"
						>
							Your item will be picked up within 2-3 days.
						</p>

						{#if formError}
							<p class="text-sm text-[#b91c1c]" role="alert">{formError}</p>
						{/if}

						<Button
							type="submit"
							class="w-full rounded-[10px] bg-[#171717] px-[16px] py-[8px] text-[#fafafa] hover:bg-[#262626]"
							disabled={submitting || !selectedOrder}
							data-name="Solid Button"
						>
							{submitting ? 'Submitting' : 'Confirm Return'}
						</Button>
					</form>
				{/if}
			</div>
		</div>
	</div>
	<SiteFooter />
</div>

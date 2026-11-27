<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { timelineMessage } from '#lib/frontend/i18n/events.ts';
	import {
		listOrders,
		getOrder,
		type TimelineEntry,
		isUnauthorized
	} from '#lib/frontend/modules/account/index.ts';
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import AccountSidebar from '#lib/frontend/components/AccountSidebar.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';
	import {
		ORDER_STATUS_LABELS,
		PAYMENT_STATUS_LABELS,
		statusLabel
	} from '#lib/frontend/content/status.ts';
	import {
		formatDate,
		formatDateTime,
		formatMoney
	} from '#lib/frontend/modules/commerce/format.ts';

	import type { OrderDetail, OrderSummary } from '#lib/frontend/modules/commerce/models.ts';

	let orders = $state<OrderSummary[]>([]);
	let order = $state<OrderDetail | null>(null);
	let loading = $state(true);
	let error = $state('');

	let lastRequested: string | null | undefined = undefined;

	const timeline = $derived.by<TimelineEntry[]>(() => {
		if (!order) return [];

		const entries: TimelineEntry[] = [
			...order.events.map((event) => ({
				id: `event-${event.id}`,
				label: timelineMessage(event) || statusLabel(ORDER_STATUS_LABELS, event.type),
				date: event.createdAt
			})),
			...order.shipments.map((shipment) => {
				const label = statusLabel(ORDER_STATUS_LABELS, shipment.status);
				const detail = [shipment.carrier, shipment.trackingNumber].filter(Boolean).join(' · ');

				return {
					id: `shipment-${shipment.id}`,
					label: detail ? `${label} · ${detail}` : label,
					date: shipment.deliveredAt ?? shipment.shippedAt
				};
			})
		];

		return entries.sort((first, second) => {
			const firstTime = first.date ? new Date(first.date).getTime() : 0;
			const secondTime = second.date ? new Date(second.date).getTime() : 0;
			return firstTime - secondTime;
		});
	});

	function redirectToLogin() {
		const target = `${page.url.pathname}${page.url.search}`;
		void goto(`/login?redirectTo=${encodeURIComponent(target)}`, { replaceState: true });
	}

	function handleError(cause: unknown) {
		if (isUnauthorized(cause)) {
			redirectToLogin();
			return;
		}

		error = errorMessage(cause, 'account_order_tracking_load_failed');
	}

	async function load(requested: string | null) {
		loading = true;
		error = '';

		try {
			orders = (await listOrders(1, 50)).data;

			let target = requested;
			if (!target && orders.length > 0) target = orders[0].orderNumber;

			if (!target) {
				order = null;
				return;
			}

			try {
				order = await getOrder(target);
			} catch (cause) {
				if (isUnauthorized(cause)) throw cause;
				if (orders.length > 0 && target !== orders[0].orderNumber) {
					order = await getOrder(orders[0].orderNumber);
				} else {
					order = null;
				}
			}
		} catch (cause) {
			order = null;
			handleError(cause);
		} finally {
			loading = false;
		}
	}

	function syncFromUrl() {
		const requested = page.url.searchParams.get('order');
		if (requested === lastRequested) return;

		lastRequested = requested;
		void load(requested);
	}

	onMount(syncFromUrl);
	afterNavigate(syncFromUrl);

	function selectOrder(value: string) {
		if (!value || value === order?.orderNumber) return;
		void goto(`/account/order-tracking?order=${encodeURIComponent(value)}`);
	}
</script>

<div
	class="relative flex size-full flex-col content-stretch items-center bg-card"
	data-name="Shopix - Track Order"
>
	<SiteHeader />
	<div
		class="relative flex w-full max-w-[1440px] shrink-0 flex-col content-stretch items-center justify-center bg-card py-[56px] max-[480px]:py-9"
		data-name="Timeline"
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
						class="relative flex w-full items-center justify-center gap-3 rounded-[14px] bg-card px-[24px] py-[64px] shadow-[0px_0px_0px_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]"
						data-name="Card"
					>
						<Spinner class="size-5" aria-label={m.account_shared_loading_order()} />
						<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground">
							{m.account_shared_loading_order()}
						</p>
					</div>
				{:else if error}
					<div
						class="relative flex w-full rounded-[14px] border border-destructive/30 bg-destructive/10 px-[24px] py-[16px] text-destructive"
						data-name="Card"
						role="alert"
					>
						{error}
					</div>
				{:else if orders.length === 0}
					<div
						class="relative flex w-full flex-col items-start gap-[12px] rounded-[14px] bg-card px-[24px] py-[32px] shadow-[0px_0px_0px_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]"
						data-name="Card"
					>
						<p
							class="font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold text-foreground"
						>
							{m.account_shared_no_orders_yet()}
						</p>
						<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground">
							{m.account_order_tracking_empty_description()}
						</p>
						<a
							href="/products"
							class="rounded-[8px] bg-primary px-[16px] py-[10px] font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-primary-foreground"
						>
							{m.common_browse_products()}
						</a>
					</div>
				{:else if order}
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] rounded-[14px] bg-card py-[24px] shadow-[0px_0px_0px_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]"
						data-name="Card"
					>
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[24px] px-[24px]"
							data-name="card-body"
						>
							{#if orders.length > 1}
								<div class="flex w-full flex-col gap-[6px] sm:max-w-[280px]">
									<Label for="order-picker">{m.common_order()}</Label>
									<Select.Root type="single" value={order.orderNumber} onValueChange={selectOrder}>
										<Select.Trigger id="order-picker" class="w-full">
											<Select.Value placeholder={m.account_shared_select_order()} />
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
								class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[12px] rounded-[8px] bg-muted p-[24px]"
								data-name="user detail"
							>
								<div
									class="relative flex w-full shrink-0 flex-wrap content-stretch items-center justify-between gap-[12px]"
									data-name="Flex Horizontal"
								>
									<div
										class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[6px]"
										data-name="Flex Vertical"
									>
										<p
											class="relative w-[min-content] min-w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-foreground"
										>
											{m.account_order_tracking_title()}
										</p>
										<p
											class="relative shrink-0 font-['Geist:Regular'] text-[18px] leading-[28px] font-normal whitespace-nowrap text-muted-foreground"
										>
											#{order.orderNumber}
										</p>
									</div>
									<div class="flex flex-wrap items-center gap-[8px]">
										<Badge variant="outline">
											{statusLabel(ORDER_STATUS_LABELS, order.status)}
										</Badge>
										<Badge variant="secondary">
											{statusLabel(PAYMENT_STATUS_LABELS, order.paymentStatus)}
										</Badge>
										<Badge variant="secondary">
											{statusLabel('fulfillment', order.fulfillmentStatus)}
										</Badge>
									</div>
								</div>

								<div class="grid w-full gap-[12px] sm:grid-cols-2">
									<div>
										<p
											class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground"
										>
											{m.account_order_tracking_carrier()}
										</p>
										<p
											class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
										>
											{order.carrier ?? '—'}
										</p>
									</div>
									<div>
										<p
											class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground"
										>
											{m.account_order_tracking_number()}
										</p>
										<p
											class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
										>
											{order.trackingNumber ?? '—'}
										</p>
									</div>
									<div>
										<p
											class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground"
										>
											{m.account_order_tracking_estimated_delivery()}
										</p>
										<p
											class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
										>
											{formatDate(order.estimatedDeliveryAt) || '—'}
										</p>
									</div>
									<div>
										<p
											class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground"
										>
											{m.account_order_tracking_placed()}
										</p>
										<p
											class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
										>
											{formatDateTime(order.placedAt) || '—'}
										</p>
									</div>
								</div>
							</div>

							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[12px]"
								data-name="Flex Vertical"
							>
								<p
									class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-foreground"
								>
									{m.account_order_tracking_items()}
								</p>
								{#if order.items.length === 0}
									<p
										class="font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground"
									>
										{m.account_order_tracking_no_items()}
									</p>
								{:else}
									<div class="flex w-full flex-col">
										{#each order.items as item (item.id)}
											<div
												class="flex w-full items-center gap-[16px] border-b border-border py-[12px] last:border-b-0"
												data-name="Flex Horizontal"
											>
												{#if item.imageUrl}
													<img
														loading="lazy"
														decoding="async"
														src={item.imageUrl}
														alt={item.productName}
														class="size-[72px] shrink-0 rounded-[8px] object-cover"
													/>
												{:else}
													<div
														class="flex size-[72px] shrink-0 items-center justify-center rounded-[8px] bg-muted text-center font-['Geist:Regular'] text-[12px] leading-[16px] text-muted-foreground"
													>
														{m.account_shared_no_image()}
													</div>
												{/if}
												<div class="min-w-0 flex-1">
													<p
														class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
													>
														{item.productName}
													</p>
													<p
														class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground"
													>
														{m.account_shared_sku({ sku: item.sku })}
													</p>
													<p
														class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground"
													>
														{m.account_shared_qty_price({
															quantity: item.quantity,
															price: formatMoney(item.unitPrice, order.currency)
														})}
													</p>
												</div>
												<p
													class="shrink-0 font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
												>
													{formatMoney(item.total, order.currency)}
												</p>
											</div>
										{/each}
									</div>
								{/if}
							</div>

							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[8px] rounded-[8px] bg-muted p-[16px] max-md:max-w-full"
								data-name="Pricing Details"
							>
								<div class="flex w-full items-center justify-between gap-[12px]">
									<p
										class="font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground"
									>
										{m.common_subtotal()}
									</p>
									<p
										class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
									>
										{formatMoney(order.subtotal, order.currency)}
									</p>
								</div>
								<div class="flex w-full items-center justify-between gap-[12px]">
									<p
										class="font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground"
									>
										{m.common_discount()}
									</p>
									<p
										class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
									>
										-{formatMoney(order.discount, order.currency)}
									</p>
								</div>
								<div class="flex w-full items-center justify-between gap-[12px]">
									<p
										class="font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground"
									>
										{m.common_shipping()}
									</p>
									<p
										class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
									>
										{formatMoney(order.shipping, order.currency)}
									</p>
								</div>
								<div
									class="flex w-full items-center justify-between gap-[12px] border-t border-border pt-[8px]"
								>
									<p
										class="font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold text-foreground"
									>
										{m.common_total()}
									</p>
									<p
										class="font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold text-foreground"
									>
										{formatMoney(order.grandTotal, order.currency)}
									</p>
								</div>
							</div>

							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[6px]"
								data-name="Flex Vertical"
							>
								<p
									class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-foreground"
								>
									{m.account_order_tracking_activity()}
								</p>
								{#if timeline.length === 0}
									<p
										class="font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground"
									>
										{m.account_order_tracking_no_activity()}
									</p>
								{:else}
									<div
										class="relative flex w-full shrink-0 flex-col content-stretch items-start"
										data-name="Timeline"
									>
										{#each timeline as entry (entry.id)}
											<div
												class="relative flex w-full shrink-0 content-stretch items-start gap-[16px]"
												data-name="TimelineItem"
											>
												<div
													class="mt-[7px] size-[10px] shrink-0 rounded-full bg-primary"
													data-name="TimelineDot"
												></div>
												<div
													class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[4px] pb-[20px] pl-[16px]"
													data-name="Data"
												>
													<p
														class="font-['Geist:Medium'] text-[18px] leading-[28px] font-medium [word-break:break-word] text-foreground"
													>
														{entry.label}
													</p>
													<p
														class="font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground"
													>
														{formatDateTime(entry.date) || '—'}
													</p>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
	<SiteFooter />
</div>

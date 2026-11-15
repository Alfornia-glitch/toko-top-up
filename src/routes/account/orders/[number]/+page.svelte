<script lang="ts">
	import {
		listOrders,
		getOrder,
		type TimelineEntry,
		EmptyState,
		OrderStatusBadge,
		isUnauthorized
	} from '#lib/frontend/modules/account/index.ts';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ChevronLeft, Clock, LifeBuoy, MapPin, Package, RotateCcw, Truck } from '@lucide/svelte';
	import AccountPageShell from '#lib/frontend/modules/account/components/AccountPageShell.svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { ORDER_STATUS_LABELS, statusLabel } from '#lib/frontend/content/status.ts';
	import {
		formatDate,
		formatDateTime,
		formatMoney
	} from '#lib/frontend/modules/commerce/format.ts';
	import type { OrderDetail } from '#lib/frontend/modules/commerce/models.ts';
	import { ApiError } from '#lib/frontend/modules/shared/http.ts';

	const number = $derived((page.params as { number?: string }).number);

	let order = $state<OrderDetail | null>(null);
	let loading = $state(true);
	let error = $state('');
	let notFound = $state(false);
	let noOrders = $state(false);

	const itemCount = $derived(
		order ? (order.itemCount ?? order.items.reduce((total, item) => total + item.quantity, 0)) : 0
	);

	const shippingLines = $derived(addressLines(order?.shippingAddress ?? null));
	const billingLines = $derived(addressLines(order?.billingAddress ?? null));

	const timeline = $derived.by<TimelineEntry[]>(() => {
		if (!order) return [];

		const entries: TimelineEntry[] = [
			...order.events.map((event) => ({
				id: `event-${event.id}`,
				label: event.message?.trim() || statusLabel(ORDER_STATUS_LABELS, event.type),
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

	function asText(value: unknown): string {
		return typeof value === 'string' ? value.trim() : '';
	}

	function addressLines(address: Record<string, unknown> | null): string[] {
		if (!address) return [];

		return [
			asText(address.recipientName) || asText(address.name),
			asText(address.line1),
			asText(address.line2),
			asText(address.city),
			asText(address.region),
			asText(address.postalCode),
			asText(address.country),
			asText(address.phone)
		].filter((line) => line.length > 0);
	}

	function redirectToLogin(): void {
		const target = `${page.url.pathname}${page.url.search}`;
		void goto(`/login?redirectTo=${encodeURIComponent(target)}`, { replaceState: true });
	}

	async function load(): Promise<void> {
		loading = true;
		error = '';
		notFound = false;
		noOrders = false;
		order = null;

		try {
			if (number === 'latest') {
				const summaries = (await listOrders(1, 1)).data;
				const first = summaries[0];

				if (!first) {
					noOrders = true;
					return;
				}

				order = await getOrder(first.orderNumber);
				return;
			}

			if (!number) {
				notFound = true;
				return;
			}

			order = await getOrder(number);
		} catch (cause) {
			if (isUnauthorized(cause)) {
				redirectToLogin();
				return;
			}

			if (cause instanceof ApiError && cause.status === 404) {
				notFound = true;
				return;
			}

			error = cause instanceof Error ? cause.message : 'Could not load this order';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<AccountPageShell
	title={order ? `Order ${order.orderNumber}` : 'Order details'}
	description={order ? `Placed ${formatDate(order.placedAt)}` : 'View your order details.'}
>
	{#snippet actions()}
		<Button variant="outline" href="/account/orders">
			<ChevronLeft class="size-4" aria-hidden="true" />
			Back to orders
		</Button>
		{#if order}
			<Button href={`/account/order-tracking?order=${encodeURIComponent(order.orderNumber)}`}>
				<Truck class="size-4" aria-hidden="true" />
				Track order
			</Button>
		{/if}
	{/snippet}

	{#if loading}
		<div class="flex flex-col gap-4" aria-busy="true" aria-label="Loading order">
			<Card.Root>
				<Card.Header class="gap-2">
					<Skeleton class="h-5 w-40" />
					<Skeleton class="h-4 w-28" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-2">
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-2/3" />
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="gap-2">
					<Skeleton class="h-5 w-24" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					{#each Array(3) as _, index (index)}
						<div class="flex items-center gap-4">
							<Skeleton class="size-16 shrink-0 rounded-lg" />
							<div class="flex flex-1 flex-col gap-2">
								<Skeleton class="h-4 w-1/2" />
								<Skeleton class="h-3 w-1/3" />
							</div>
							<Skeleton class="h-4 w-16" />
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="gap-2">
					<Skeleton class="h-5 w-32" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-2">
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-1/2" />
				</Card.Content>
			</Card.Root>
		</div>
	{:else if notFound}
		<Card.Root>
			<Card.Header>
				<Card.Title>Order not found</Card.Title>
				<Card.Description>We could not find an order with that number.</Card.Description>
			</Card.Header>
			<Card.Content>
				<Button variant="outline" href="/account/orders">
					<ChevronLeft class="size-4" aria-hidden="true" />
					Back to orders
				</Button>
			</Card.Content>
		</Card.Root>
	{:else if error}
		<div
			class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
			role="alert"
		>
			<span>{error}</span>
			<Button variant="outline" size="sm" onclick={() => void load()}>Retry</Button>
		</div>
	{:else if noOrders}
		<EmptyState
			title="No orders yet"
			description="Orders you place will appear here with their details."
		>
			{#snippet icon()}
				<Package class="size-5" aria-hidden="true" />
			{/snippet}
			{#snippet action()}
				<Button href="/products">Browse products</Button>
			{/snippet}
		</EmptyState>
	{:else if order}
		<Card.Root>
			<Card.Header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div class="space-y-1">
					<Card.Title class="text-lg">Order {order.orderNumber}</Card.Title>
					<Card.Description>Placed {formatDate(order.placedAt) || '—'}</Card.Description>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<OrderStatusBadge status={order.status} kind="order" />
					<OrderStatusBadge status={order.paymentStatus} kind="payment" />
					<OrderStatusBadge status={order.fulfillmentStatus} kind="fulfillment" />
				</div>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				<Separator />
				<dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
					<div class="min-w-0">
						<dt class="text-xs text-muted-foreground">Order number</dt>
						<dd class="truncate text-sm font-medium text-foreground">{order.orderNumber}</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-xs text-muted-foreground">Placed</dt>
						<dd class="text-sm font-medium text-foreground">{formatDate(order.placedAt) || '—'}</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-xs text-muted-foreground">Items</dt>
						<dd class="text-sm font-medium text-foreground tabular-nums">{itemCount}</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-xs text-muted-foreground">Grand total</dt>
						<dd class="text-sm font-medium text-foreground tabular-nums">
							{formatMoney(order.grandTotalCents, order.currency)}
						</dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Package class="size-4" aria-hidden="true" />
					Items
				</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if order.items.length === 0}
					<p class="text-sm text-muted-foreground">This order has no items.</p>
				{:else}
					<ul class="flex flex-col divide-y divide-border">
						{#each order.items as item (item.id)}
							<li
								class="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center"
							>
								{#if item.imageUrl}
									<img
										src={item.imageUrl}
										alt={item.productName}
										class="size-16 shrink-0 rounded-lg object-cover sm:size-[72px]"
										loading="lazy"
									/>
								{:else}
									<ImagePlaceholder class="size-16 shrink-0 rounded-lg sm:size-[72px]" />
								{/if}
								<div class="min-w-0 space-y-1">
									<p class="text-sm font-medium break-words text-foreground">{item.productName}</p>
									<p class="text-xs text-muted-foreground">SKU: {item.sku}</p>
									<p class="text-sm text-muted-foreground">
										{item.quantity} × {formatMoney(item.unitPriceCents, order.currency)}
									</p>
								</div>
								<div class="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
									<OrderStatusBadge status={item.status} kind="order" />
									<p class="text-sm font-medium text-foreground tabular-nums">
										{formatMoney(item.totalCents, order.currency)}
									</p>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Order total</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="flex flex-col gap-2 text-sm">
					<div class="flex items-center justify-between gap-3">
						<dt class="text-muted-foreground">Subtotal</dt>
						<dd class="font-medium text-foreground tabular-nums">
							{formatMoney(order.subtotalCents, order.currency)}
						</dd>
					</div>
					<div class="flex items-center justify-between gap-3">
						<dt class="text-muted-foreground">Discount</dt>
						<dd class="font-medium text-foreground tabular-nums">
							-{formatMoney(order.discountCents, order.currency)}
						</dd>
					</div>
					<div class="flex items-center justify-between gap-3">
						<dt class="text-muted-foreground">Shipping</dt>
						<dd class="font-medium text-foreground tabular-nums">
							{formatMoney(order.shippingCents, order.currency)}
						</dd>
					</div>
					<div class="flex items-center justify-between gap-3">
						<dt class="text-muted-foreground">Tax</dt>
						<dd class="font-medium text-foreground tabular-nums">
							{formatMoney(order.taxCents, order.currency)}
						</dd>
					</div>
					<Separator />
					<div class="flex items-center justify-between gap-3 text-base">
						<dt class="font-semibold text-foreground">Total</dt>
						<dd class="font-semibold text-foreground tabular-nums">
							{formatMoney(order.grandTotalCents, order.currency)}
						</dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>

		<div class="grid gap-4 sm:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<MapPin class="size-4" aria-hidden="true" />
						Shipping address
					</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if shippingLines.length > 0}
						<address class="flex flex-col gap-1 text-sm text-muted-foreground not-italic">
							{#each shippingLines as line, index (index)}
								<span>{line}</span>
							{/each}
						</address>
					{:else}
						<p class="text-sm text-muted-foreground">Not provided</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<MapPin class="size-4" aria-hidden="true" />
						Billing address
					</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if billingLines.length > 0}
						<address class="flex flex-col gap-1 text-sm text-muted-foreground not-italic">
							{#each billingLines as line, index (index)}
								<span>{line}</span>
							{/each}
						</address>
					{:else}
						<p class="text-sm text-muted-foreground">Not provided</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Clock class="size-4" aria-hidden="true" />
					Timeline
				</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if timeline.length === 0}
					<p class="text-sm text-muted-foreground">No updates yet</p>
				{:else}
					<ol class="flex flex-col">
						{#each timeline as entry, index (entry.id)}
							<li class="flex gap-4">
								<div class="flex flex-col items-center">
									<span
										class="mt-1.5 size-2.5 shrink-0 rounded-full bg-foreground"
										aria-hidden="true"
									></span>
									{#if index < timeline.length - 1}
										<span class="w-px flex-1 bg-border" aria-hidden="true"></span>
									{/if}
								</div>
								<div class={`min-w-0 ${index < timeline.length - 1 ? 'pb-5' : ''}`}>
									<p class="text-sm font-medium break-words text-foreground">{entry.label}</p>
									<p class="text-xs text-muted-foreground">
										{formatDateTime(entry.date) || '—'}
									</p>
								</div>
							</li>
						{/each}
					</ol>
				{/if}
			</Card.Content>
		</Card.Root>

		<div class="flex flex-wrap items-center gap-2">
			<Button variant="outline" href="/account/returns-refunds">
				<RotateCcw class="size-4" aria-hidden="true" />
				Start a return
			</Button>
			<Button variant="ghost" href="/account/support-tickets">
				<LifeBuoy class="size-4" aria-hidden="true" />
				Get help
			</Button>
		</div>
	{/if}
</AccountPageShell>

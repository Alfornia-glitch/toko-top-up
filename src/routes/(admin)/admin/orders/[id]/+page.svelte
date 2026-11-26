<script lang="ts">
	import { readAccountDetails } from '#lib/frontend/modules/commerce/account-form.ts';
	import {
		formatDate as formatDateOnlyRaw,
		formatDateTime,
		formatMoney
	} from '#lib/frontend/modules/commerce/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { enumLabel, errorMessage, statusLabel } from '#lib/frontend/i18n/index.ts';
	import { onMount } from 'svelte';
	import { timelineMessage } from '#lib/frontend/i18n/events.ts';
	import { page } from '$app/state';
	import { ArrowLeft, LoaderCircle, Package, Save, Truck } from '@lucide/svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Dialog from '#lib/frontend/components/ui/dialog/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';

	type OrderItem = {
		id: string;
		productNameSnapshot: string;
		skuSnapshot: string;
		imageUrlSnapshot: string | null;
		quantity: number;
		unitPrice: number;
		total: number;
		status: string;
	};

	type OrderEvent = {
		id: string;
		type: string;
		message: string;
		actorUserId: string | null;
		createdAt: string;
	};

	type Shipment = {
		id: string;
		carrier: string;
		trackingNumber: string;
		status: string;
		shippedAt: string | null;
		deliveredAt: string | null;
		createdAt: string;
	};

	type Payment = {
		id: string;
		provider: string;
		providerRef: string | null;
		amount: number;
		status: string;
		paidAt: string | null;
		failureReason: string | null;
	};

	type Customer = {
		id: string;
		name: string | null;
		email: string | null;
	};

	type OrderDetail = {
		id: string;
		orderNumber: string;
		userId: string | null;
		status: string;
		paymentStatus: string;
		fulfillmentStatus: string;
		subtotal: number;
		discount: number;
		shipping: number;
		tax: number;
		grandTotal: number;
		currency: string;
		shippingAddressJson: unknown;
		billingAddressJson: unknown;
		trackingNumber: string | null;
		carrier: string | null;
		estimatedDeliveryAt: string | null;
		placedAt: string;
		notes: string | null;
		createdAt: string;
		updatedAt: string;
		customer: Customer | null;
		items: OrderItem[];
		events: OrderEvent[];
		shipments: Shipment[];
		payments: Payment[];
	};

	type AddressShape = {
		recipientName?: string;
		phone?: string;
		line1?: string;
		line2?: string;
		city?: string;
		region?: string;
		postalCode?: string;
		country?: string;
	};

	const orderStatuses = [
		'pending',
		'paid',
		'processing',
		'shipped',
		'delivered',
		'cancelled',
		'refunded'
	];

	const ORDER_TRANSITIONS: Record<string, string[]> = {
		pending: ['paid', 'cancelled'],
		paid: ['processing', 'cancelled', 'refunded'],
		processing: ['shipped', 'cancelled', 'refunded'],
		shipped: ['delivered', 'refunded'],
		delivered: ['refunded'],
		cancelled: [],
		refunded: []
	};

	let order = $state<OrderDetail | null>(null);
	let loading = $state(true);
	let error = $state('');
	let actionError = $state('');

	let status = $state('');
	let trackingNumber = $state('');
	let carrier = $state('');
	let estimatedDelivery = $state('');
	let savingFulfillment = $state(false);

	let note = $state('');
	let savingNote = $state(false);

	let shipOpen = $state(false);
	let shipCarrier = $state('');
	let shipTracking = $state('');
	let shipping = $state(false);
	let shipError = $state('');

	onMount(() => {
		void load(page.params.id);
	});

	async function load(id: string | undefined) {
		if (!id) {
			error = m.admin_ops_order_not_found_short();
			loading = false;
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/admin/orders/${id}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_order_load_failed'));

			order = payload.data as OrderDetail;
			syncForm(order);
		} catch (err) {
			error = errorMessage(err, 'admin_ops_order_load_failed');
		} finally {
			loading = false;
		}
	}

	function syncForm(value: OrderDetail) {
		status = value.status;
		trackingNumber = value.trackingNumber ?? '';
		carrier = value.carrier ?? '';
		estimatedDelivery = toDatetimeLocal(value.estimatedDeliveryAt);
	}

	function toDatetimeLocal(value: string | null) {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';

		const pad = (input: number) => String(input).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	function isTransitionAllowed(from: string, to: string) {
		return from === to || (ORDER_TRANSITIONS[from] ?? []).includes(to);
	}

	const statusInvalid = $derived(order ? !isTransitionAllowed(order.status, status) : false);
	const shipmentDisabled = $derived(
		!order || ['pending', 'cancelled', 'refunded'].includes(order.status)
	);

	const sortedEvents = $derived(
		[...(order?.events ?? [])].sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		)
	);

	function parseAddress(value: unknown): AddressShape | null {
		if (!value) return null;

		if (typeof value === 'string') {
			try {
				const parsed = JSON.parse(value);
				return parsed && typeof parsed === 'object' ? (parsed as AddressShape) : null;
			} catch {
				return null;
			}
		}

		return typeof value === 'object' ? (value as AddressShape) : null;
	}

	function addressLine(address: AddressShape) {
		return [address.city, address.region, address.postalCode].filter(Boolean).join(', ');
	}

	async function saveFulfillment(event: SubmitEvent) {
		event.preventDefault();
		if (!order) return;

		actionError = '';

		if (!isTransitionAllowed(order.status, status)) {
			actionError = m.admin_ops_order_invalid_transition({
				from: statusLabel('order', order.status),
				to: statusLabel('order', status)
			});
			return;
		}

		savingFulfillment = true;

		try {
			const response = await fetch(`/api/admin/orders/${order.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					status,
					trackingNumber: trackingNumber.trim() || null,
					carrier: carrier.trim() || null,
					estimatedDeliveryAt: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : null
				})
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_order_update_failed'));

			await load(order.id);
		} catch (err) {
			actionError = errorMessage(err, 'admin_ops_order_update_failed');
		} finally {
			savingFulfillment = false;
		}
	}

	async function addNote(event: SubmitEvent) {
		event.preventDefault();
		if (!order || !note.trim()) return;

		actionError = '';
		savingNote = true;

		try {
			const response = await fetch(`/api/admin/orders/${order.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ note: note.trim() })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_order_note_failed'));

			note = '';
			await load(order.id);
		} catch (err) {
			actionError = errorMessage(err, 'admin_ops_order_note_failed');
		} finally {
			savingNote = false;
		}
	}

	function openShip() {
		if (!order) return;
		shipCarrier = order.carrier ?? '';
		shipTracking = order.trackingNumber ?? '';
		shipError = '';
		shipOpen = true;
	}

	async function shipOrder(event: SubmitEvent) {
		event.preventDefault();
		if (!order) return;

		shipError = '';

		const nextCarrier = shipCarrier.trim();
		const nextTracking = shipTracking.trim();

		if (!nextCarrier || !nextTracking) {
			shipError = m.admin_ops_order_ship_required();
			return;
		}

		shipping = true;

		try {
			const response = await fetch(`/api/admin/orders/${order.id}/shipments`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ carrier: nextCarrier, trackingNumber: nextTracking })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_order_ship_failed'));

			shipOpen = false;
			await load(order.id);
		} catch (err) {
			shipError = errorMessage(err, 'admin_ops_order_ship_failed');
		} finally {
			shipping = false;
		}
	}

	function formatDate(value: string | null) {
		return formatDateTime(value) || '—';
	}

	function formatDateOnly(value: string | null) {
		return formatDateOnlyRaw(value) || '—';
	}
</script>

{#if loading}
	<div class="flex h-64 items-center justify-center">
		<LoaderCircle class="size-6 animate-spin text-muted-foreground" />
	</div>
{:else if error}
	<Card.Root>
		<Card.Content class="space-y-4 py-10 text-center">
			<p class="text-sm text-destructive">{error}</p>
			<div class="flex justify-center gap-2">
				<Button variant="outline" href="/admin/orders">
					<ArrowLeft class="size-4" />
					{m.admin_ops_order_back()}
				</Button>
				<Button onclick={() => void load(page.params.id)}>{m.common_retry()}</Button>
			</div>
		</Card.Content>
	</Card.Root>
{:else if order}
	<div class="space-y-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="space-y-2">
				<Button variant="ghost" size="sm" href="/admin/orders">
					<ArrowLeft class="size-4" />
					{m.admin_ops_order_back()}
				</Button>
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-2xl font-semibold tracking-tight">
						{m.admin_ops_order_heading({ number: order.orderNumber })}
					</h1>
					<StatusBadge kind="order" status={order.status} />
					<StatusBadge kind="payment" status={order.paymentStatus} />
					<StatusBadge kind="fulfillment" status={order.fulfillmentStatus} />
				</div>
				<p class="text-sm text-muted-foreground">
					{m.admin_ops_order_placed({ date: formatDate(order.placedAt) })}
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Button variant="outline" onclick={openShip} disabled={shipmentDisabled}>
					<Truck class="size-4" />
					{m.admin_ops_order_ship()}
				</Button>
			</div>
		</div>

		{#if shipmentDisabled}
			<div class="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
				{m.admin_ops_order_ship_blocked({ status: statusLabel('order', order.status) })}
			</div>
		{/if}

		{#if actionError}
			<div
				class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
				role="alert"
			>
				{actionError}
			</div>
		{/if}

		<div class="grid gap-4 lg:grid-cols-3">
			<Card.Root>
				<Card.Header>
					<Card.Title>{m.common_customer()}</Card.Title>
					<Card.Description>{m.admin_ops_order_customer_desc()}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-1 text-sm">
					{#if order.customer}
						<p class="font-medium">{order.customer.name ?? m.admin_ops_return_unnamed()}</p>
						<p class="text-muted-foreground">
							{order.customer.email ?? m.admin_ops_return_no_email()}
						</p>
						<p class="text-xs text-muted-foreground">
							{m.admin_ops_return_user_id({ id: order.customer.id })}
						</p>
					{:else}
						<p class="text-muted-foreground">{m.admin_ops_order_guest()}</p>
						{#if order.userId}
							<p class="text-xs text-muted-foreground">
								{m.admin_ops_return_user_id({ id: order.userId })}
							</p>
						{/if}
					{/if}
				</Card.Content>
			</Card.Root>

			{#if readAccountDetails(order.shippingAddressJson)}
				{@const details = readAccountDetails(order.shippingAddressJson) ?? []}
				<Card.Root>
					<Card.Header>
						<Card.Title>{m.admin_ops_order_account_details()}</Card.Title>
					</Card.Header>
					<Card.Content>
						<dl class="grid gap-x-4 gap-y-0.5 text-sm sm:grid-cols-[auto_1fr]">
							{#each details as detail (detail.id)}
								<dt class="text-muted-foreground">{detail.label}</dt>
								<dd class="font-medium break-words text-foreground">{detail.value}</dd>
							{/each}
						</dl>
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root>
					<Card.Header>
						<Card.Title>{m.admin_ops_order_shipping_address()}</Card.Title>
					</Card.Header>
					<Card.Content>
						{#if parseAddress(order.shippingAddressJson)}
							{@const address = parseAddress(order.shippingAddressJson) as AddressShape}
							<address class="space-y-0.5 text-sm text-muted-foreground not-italic">
								{#if address.recipientName}
									<p class="font-medium text-foreground">{address.recipientName}</p>
								{/if}
								{#if address.line1}<p>{address.line1}</p>{/if}
								{#if address.line2}<p>{address.line2}</p>{/if}
								{#if addressLine(address)}<p>{addressLine(address)}</p>{/if}
								{#if address.country}<p>{address.country}</p>{/if}
								{#if address.phone}<p>{address.phone}</p>{/if}
							</address>
						{:else}
							<p class="text-sm text-muted-foreground">{m.admin_ops_order_no_shipping_address()}</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>{m.admin_ops_order_billing_address()}</Card.Title>
					</Card.Header>
					<Card.Content>
						{#if parseAddress(order.billingAddressJson)}
							{@const address = parseAddress(order.billingAddressJson) as AddressShape}
							<address class="space-y-0.5 text-sm text-muted-foreground not-italic">
								{#if address.recipientName}
									<p class="font-medium text-foreground">{address.recipientName}</p>
								{/if}
								{#if address.line1}<p>{address.line1}</p>{/if}
								{#if address.line2}<p>{address.line2}</p>{/if}
								{#if addressLine(address)}<p>{addressLine(address)}</p>{/if}
								{#if address.country}<p>{address.country}</p>{/if}
								{#if address.phone}<p>{address.phone}</p>{/if}
							</address>
						{:else}
							<p class="text-sm text-muted-foreground">{m.admin_ops_order_no_billing_address()}</p>
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>{m.admin_ops_order_items()}</Card.Title>
				<Card.Description>
					{m.admin_ops_order_items_desc({ count: order.items.length })}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{m.common_product()}</Table.Head>
							<Table.Head>SKU</Table.Head>
							<Table.Head class="text-right">{m.admin_ops_order_col_qty()}</Table.Head>
							<Table.Head class="text-right">{m.admin_ops_order_col_unit_price()}</Table.Head>
							<Table.Head class="text-right">{m.common_total()}</Table.Head>
							<Table.Head>{m.common_status()}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each order.items as item (item.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex items-center gap-3">
										{#if item.imageUrlSnapshot}
											<img
												src={item.imageUrlSnapshot}
												alt={item.productNameSnapshot}
												class="size-10 rounded-md border bg-muted object-cover"
												loading="lazy"
											/>
										{:else}
											<div
												class="flex size-10 items-center justify-center rounded-md border bg-muted text-muted-foreground"
											>
												<Package class="size-4" />
											</div>
										{/if}
										<span class="font-medium">{item.productNameSnapshot}</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<code class="text-xs text-muted-foreground">{item.skuSnapshot}</code>
								</Table.Cell>
								<Table.Cell class="text-right">{item.quantity}</Table.Cell>
								<Table.Cell class="text-right">
									{formatMoney(item.unitPrice, order.currency)}
								</Table.Cell>
								<Table.Cell class="text-right font-medium">
									{formatMoney(item.total, order.currency)}
								</Table.Cell>
								<Table.Cell><StatusBadge status={item.status} /></Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>

		<div class="grid gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>{m.admin_ops_order_totals()}</Card.Title>
					<Card.Description>{order.currency}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-2 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">{m.common_subtotal()}</span>
						<span>{formatMoney(order.subtotal, order.currency)}</span>
					</div>
					{#if order.discount !== 0}
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">{m.common_discount()}</span>
							<span>-{formatMoney(order.discount, order.currency)}</span>
						</div>
					{/if}
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">{m.common_shipping()}</span>
						<span>{formatMoney(order.shipping, order.currency)}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">{m.common_tax()}</span>
						<span>{formatMoney(order.tax, order.currency)}</span>
					</div>
					<Separator />
					<div class="flex items-center justify-between text-base font-semibold">
						<span>{m.admin_ops_order_grand_total()}</span>
						<span>{formatMoney(order.grandTotal, order.currency)}</span>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{m.admin_ops_order_fulfillment()}</Card.Title>
					<Card.Description>{m.admin_ops_order_fulfillment_desc()}</Card.Description>
				</Card.Header>
				<Card.Content>
					<form class="grid gap-4" onsubmit={saveFulfillment}>
						<Field.Group>
							<Field.Field>
								<Field.Label for="order-status">{m.admin_ops_order_status_label()}</Field.Label>
								<Select.Root type="single" bind:value={status}>
									<Select.Trigger id="order-status" class="w-full">
										<Select.Value placeholder={m.admin_ops_order_select_status()} />
									</Select.Trigger>
									<Select.Content>
										{#each orderStatuses as option (option)}
											<Select.Item
												value={option}
												label={statusLabel('order', option)}
												disabled={!isTransitionAllowed(order.status, option)}
											>
												{statusLabel('order', option)}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								{#if statusInvalid}
									<Field.Error>
										{m.admin_ops_order_invalid_transition({
											from: statusLabel('order', order.status),
											to: statusLabel('order', status)
										})}
									</Field.Error>
								{:else}
									<Field.Description>
										{m.admin_ops_order_current_status({
											status: statusLabel('order', order.status)
										})}
									</Field.Description>
								{/if}
							</Field.Field>

							<div class="grid gap-4 sm:grid-cols-2">
								<Field.Field>
									<Field.Label for="order-carrier">{m.admin_ops_order_carrier()}</Field.Label>
									<Input
										id="order-carrier"
										bind:value={carrier}
										placeholder={m.admin_ops_order_carrier_placeholder_main()}
									/>
								</Field.Field>

								<Field.Field>
									<Field.Label for="order-tracking">{m.admin_ops_order_tracking()}</Field.Label>
									<Input
										id="order-tracking"
										bind:value={trackingNumber}
										placeholder={m.admin_ops_order_tracking()}
									/>
								</Field.Field>
							</div>

							<Field.Field>
								<Field.Label for="order-eta">{m.admin_ops_order_eta()}</Field.Label>
								<Input id="order-eta" type="datetime-local" bind:value={estimatedDelivery} />
								<Field.Description>{m.admin_ops_order_eta_hint()}</Field.Description>
							</Field.Field>
						</Field.Group>

						<div class="flex justify-end">
							<Button type="submit" disabled={savingFulfillment || statusInvalid}>
								<Save class="size-4" />
								{savingFulfillment ? m.common_saving() : m.admin_ops_order_save_fulfillment()}
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>{m.admin_ops_order_timeline()}</Card.Title>
					<Card.Description>{m.admin_ops_order_timeline_desc()}</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if sortedEvents.length === 0}
						<p class="text-sm text-muted-foreground">{m.admin_ops_order_no_events()}</p>
					{:else}
						<ol class="space-y-4">
							{#each sortedEvents as event (event.id)}
								<li class="flex gap-3">
									<span class="mt-1.5 size-2 shrink-0 rounded-full bg-primary"></span>
									<div class="min-w-0 space-y-1">
										<div class="flex flex-wrap items-center gap-2">
											<StatusBadge status={event.type} />
											<span class="text-xs text-muted-foreground">
												{formatDate(event.createdAt)}
											</span>
										</div>
										<p class="text-sm">{timelineMessage(event)}</p>
									</div>
								</li>
							{/each}
						</ol>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{m.admin_ops_order_add_note()}</Card.Title>
					<Card.Description>{m.admin_ops_order_add_note_desc()}</Card.Description>
				</Card.Header>
				<Card.Content>
					<form class="space-y-3" onsubmit={addNote}>
						<Textarea
							bind:value={note}
							placeholder={m.admin_ops_order_note_placeholder()}
							rows={3}
							required
						/>
						<div class="flex justify-end">
							<Button type="submit" disabled={savingNote || !note.trim()}>
								{savingNote ? m.admin_ops_order_adding() : m.admin_ops_order_add_note()}
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>{m.admin_ops_order_shipments()}</Card.Title>
					<Card.Description>{m.admin_ops_order_shipments_desc()}</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if order.shipments.length === 0}
						<p class="text-sm text-muted-foreground">{m.admin_ops_order_no_shipments()}</p>
					{:else}
						<ul class="divide-y">
							{#each order.shipments as shipment (shipment.id)}
								<li class="space-y-1 py-3 first:pt-0 last:pb-0">
									<div class="flex flex-wrap items-center justify-between gap-2">
										<div>
											<p class="text-sm font-medium">{shipment.carrier}</p>
											<p class="text-xs text-muted-foreground">
												{shipment.trackingNumber}
											</p>
										</div>
										<StatusBadge kind="fulfillment" status={shipment.status} />
									</div>
									<p class="text-xs text-muted-foreground">
										{m.admin_ops_order_shipment_dates({
											shipped: formatDate(shipment.shippedAt),
											delivered: formatDate(shipment.deliveredAt)
										})}
									</p>
								</li>
							{/each}
						</ul>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{m.admin_ops_order_payments()}</Card.Title>
					<Card.Description>{m.admin_ops_order_payments_desc()}</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if order.payments.length === 0}
						<p class="text-sm text-muted-foreground">{m.admin_ops_order_no_payments()}</p>
					{:else}
						<ul class="divide-y">
							{#each order.payments as payment (payment.id)}
								<li class="space-y-1 py-3 first:pt-0 last:pb-0">
									<div class="flex flex-wrap items-center justify-between gap-2">
										<div>
											<p class="text-sm font-medium">
												{enumLabel('payment_type', payment.provider)}
											</p>
											{#if payment.providerRef}
												<p class="text-xs text-muted-foreground">{payment.providerRef}</p>
											{/if}
										</div>
										<div class="flex items-center gap-2">
											<span class="text-sm font-medium">
												{formatMoney(payment.amount, order.currency)}
											</span>
											<StatusBadge kind="payment" status={payment.status} />
										</div>
									</div>
									<p class="text-xs text-muted-foreground">
										{m.admin_ops_order_paid_on({ date: formatDateOnly(payment.paidAt) })}
									</p>
									{#if payment.failureReason}
										<p class="text-xs text-destructive">{payment.failureReason}</p>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		{#if order.notes}
			<Card.Root>
				<Card.Header>
					<Card.Title>{m.admin_ops_order_notes()}</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-sm whitespace-pre-line text-muted-foreground">{order.notes}</p>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<Dialog.Root bind:open={shipOpen}>
		<Dialog.Content class="sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>{m.admin_ops_order_ship()}</Dialog.Title>
				<Dialog.Description>{m.admin_ops_order_ship_dialog_desc()}</Dialog.Description>
			</Dialog.Header>

			<form class="grid gap-4" onsubmit={shipOrder}>
				<Field.Field>
					<Field.Label for="ship-carrier">{m.admin_ops_order_carrier()}</Field.Label>
					<Input
						id="ship-carrier"
						bind:value={shipCarrier}
						placeholder={m.admin_ops_order_carrier_placeholder_ship()}
						required
					/>
				</Field.Field>

				<Field.Field>
					<Field.Label for="ship-tracking">{m.admin_ops_order_tracking()}</Field.Label>
					<Input
						id="ship-tracking"
						bind:value={shipTracking}
						placeholder={m.admin_ops_order_tracking()}
						required
					/>
				</Field.Field>

				{#if shipError}
					<Field.Error>{shipError}</Field.Error>
				{/if}

				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						onclick={() => (shipOpen = false)}
						disabled={shipping}
					>
						{m.common_cancel()}
					</Button>
					<Button type="submit" disabled={shipping}>
						<Truck class="size-4" />
						{shipping ? m.admin_ops_order_creating() : m.admin_ops_order_create_shipment()}
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<Card.Root>
		<Card.Content class="space-y-4 py-10 text-center">
			<p class="text-sm text-muted-foreground">{m.admin_ops_order_not_found()}</p>
			<Button href="/admin/orders">{m.admin_ops_order_back()}</Button>
		</Card.Content>
	</Card.Root>
{/if}

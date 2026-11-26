<script lang="ts">
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { onMount } from 'svelte';
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
			error = 'Order not found.';
			loading = false;
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/admin/orders/${id}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load order');

			order = payload.data as OrderDetail;
			syncForm(order);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load order';
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
			actionError = `Cannot move an order from "${order.status}" to "${status}".`;
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

			if (!response.ok) throw new Error(payload.error ?? 'Could not update order');

			await load(order.id);
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Could not update order';
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

			if (!response.ok) throw new Error(payload.error ?? 'Could not add note');

			note = '';
			await load(order.id);
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Could not add note';
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
			shipError = 'Carrier and tracking number are required.';
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

			if (!response.ok) throw new Error(payload.error ?? 'Could not create shipment');

			shipOpen = false;
			await load(order.id);
		} catch (err) {
			shipError = err instanceof Error ? err.message : 'Could not create shipment';
		} finally {
			shipping = false;
		}
	}

	function formatDate(value: string | null) {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function formatDateOnly(value: string | null) {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
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
					Back to orders
				</Button>
				<Button onclick={() => void load(page.params.id)}>Try again</Button>
			</div>
		</Card.Content>
	</Card.Root>
{:else if order}
	<div class="space-y-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="space-y-2">
				<Button variant="ghost" size="sm" href="/admin/orders">
					<ArrowLeft class="size-4" />
					Back to orders
				</Button>
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-2xl font-semibold tracking-tight">Order {order.orderNumber}</h1>
					<StatusBadge status={order.status} />
					<StatusBadge status={order.paymentStatus} />
					<StatusBadge status={order.fulfillmentStatus} />
				</div>
				<p class="text-sm text-muted-foreground">Placed {formatDate(order.placedAt)}</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Button variant="outline" onclick={openShip} disabled={shipmentDisabled}>
					<Truck class="size-4" />
					Ship order
				</Button>
			</div>
		</div>

		{#if shipmentDisabled}
			<div class="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
				Shipments cannot be created while the order is {order.status}.
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
					<Card.Title>Customer</Card.Title>
					<Card.Description>Account that placed the order.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-1 text-sm">
					{#if order.customer}
						<p class="font-medium">{order.customer.name ?? 'Unnamed customer'}</p>
						<p class="text-muted-foreground">{order.customer.email ?? 'No email'}</p>
						<p class="text-xs text-muted-foreground">ID: {order.customer.id}</p>
					{:else}
						<p class="text-muted-foreground">Guest order</p>
						{#if order.userId}
							<p class="text-xs text-muted-foreground">ID: {order.userId}</p>
						{/if}
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Shipping address</Card.Title>
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
						<p class="text-sm text-muted-foreground">No shipping address on file.</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Billing address</Card.Title>
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
						<p class="text-sm text-muted-foreground">No billing address on file.</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Items</Card.Title>
				<Card.Description>{order.items.length} line items in this order.</Card.Description>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Product</Table.Head>
							<Table.Head>SKU</Table.Head>
							<Table.Head class="text-right">Qty</Table.Head>
							<Table.Head class="text-right">Unit price</Table.Head>
							<Table.Head class="text-right">Total</Table.Head>
							<Table.Head>Status</Table.Head>
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
					<Card.Title>Totals</Card.Title>
					<Card.Description>{order.currency}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-2 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Subtotal</span>
						<span>{formatMoney(order.subtotal, order.currency)}</span>
					</div>
					{#if order.discount !== 0}
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Discount</span>
							<span>-{formatMoney(order.discount, order.currency)}</span>
						</div>
					{/if}
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Shipping</span>
						<span>{formatMoney(order.shipping, order.currency)}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Tax</span>
						<span>{formatMoney(order.tax, order.currency)}</span>
					</div>
					<Separator />
					<div class="flex items-center justify-between text-base font-semibold">
						<span>Grand total</span>
						<span>{formatMoney(order.grandTotal, order.currency)}</span>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Fulfillment</Card.Title>
					<Card.Description>Update status, carrier and delivery estimate.</Card.Description>
				</Card.Header>
				<Card.Content>
					<form class="grid gap-4" onsubmit={saveFulfillment}>
						<Field.Group>
							<Field.Field>
								<Field.Label for="order-status">Order status</Field.Label>
								<Select.Root type="single" bind:value={status}>
									<Select.Trigger id="order-status" class="w-full">
										<Select.Value placeholder="Select status" />
									</Select.Trigger>
									<Select.Content>
										{#each orderStatuses as option (option)}
											<Select.Item
												value={option}
												label={option}
												disabled={!isTransitionAllowed(order.status, option)}
											>
												{option}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								{#if statusInvalid}
									<Field.Error>
										Cannot move an order from “{order.status}” to “{status}”.
									</Field.Error>
								{:else}
									<Field.Description>
										Current status: {order.status}. Only valid transitions can be saved.
									</Field.Description>
								{/if}
							</Field.Field>

							<div class="grid gap-4 sm:grid-cols-2">
								<Field.Field>
									<Field.Label for="order-carrier">Carrier</Field.Label>
									<Input id="order-carrier" bind:value={carrier} placeholder="e.g. UPS" />
								</Field.Field>

								<Field.Field>
									<Field.Label for="order-tracking">Tracking number</Field.Label>
									<Input
										id="order-tracking"
										bind:value={trackingNumber}
										placeholder="Tracking number"
									/>
								</Field.Field>
							</div>

							<Field.Field>
								<Field.Label for="order-eta">Estimated delivery</Field.Label>
								<Input id="order-eta" type="datetime-local" bind:value={estimatedDelivery} />
								<Field.Description>Leave empty to clear the estimate.</Field.Description>
							</Field.Field>
						</Field.Group>

						<div class="flex justify-end">
							<Button type="submit" disabled={savingFulfillment || statusInvalid}>
								<Save class="size-4" />
								{savingFulfillment ? 'Saving…' : 'Save fulfillment'}
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Timeline</Card.Title>
					<Card.Description>Events, newest first.</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if sortedEvents.length === 0}
						<p class="text-sm text-muted-foreground">No events recorded yet.</p>
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
										<p class="text-sm">{event.message}</p>
									</div>
								</li>
							{/each}
						</ol>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Add note</Card.Title>
					<Card.Description>Internal note attached to the order timeline.</Card.Description>
				</Card.Header>
				<Card.Content>
					<form class="space-y-3" onsubmit={addNote}>
						<Textarea bind:value={note} placeholder="Write an internal note" rows={3} required />
						<div class="flex justify-end">
							<Button type="submit" disabled={savingNote || !note.trim()}>
								{savingNote ? 'Adding…' : 'Add note'}
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Shipments</Card.Title>
					<Card.Description>Carrier handoffs for this order.</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if order.shipments.length === 0}
						<p class="text-sm text-muted-foreground">No shipments yet.</p>
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
										<StatusBadge status={shipment.status} />
									</div>
									<p class="text-xs text-muted-foreground">
										Shipped {formatDate(shipment.shippedAt)} · Delivered {formatDate(
											shipment.deliveredAt
										)}
									</p>
								</li>
							{/each}
						</ul>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Payments</Card.Title>
					<Card.Description>Payment attempts and refunds.</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if order.payments.length === 0}
						<p class="text-sm text-muted-foreground">No payments recorded yet.</p>
					{:else}
						<ul class="divide-y">
							{#each order.payments as payment (payment.id)}
								<li class="space-y-1 py-3 first:pt-0 last:pb-0">
									<div class="flex flex-wrap items-center justify-between gap-2">
										<div>
											<p class="text-sm font-medium capitalize">{payment.provider}</p>
											{#if payment.providerRef}
												<p class="text-xs text-muted-foreground">{payment.providerRef}</p>
											{/if}
										</div>
										<div class="flex items-center gap-2">
											<span class="text-sm font-medium">
												{formatMoney(payment.amount, order.currency)}
											</span>
											<StatusBadge status={payment.status} />
										</div>
									</div>
									<p class="text-xs text-muted-foreground">
										Paid {formatDateOnly(payment.paidAt)}
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
					<Card.Title>Order notes</Card.Title>
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
				<Dialog.Title>Ship order</Dialog.Title>
				<Dialog.Description>Create a shipment and mark this order as fulfilled.</Dialog.Description>
			</Dialog.Header>

			<form class="grid gap-4" onsubmit={shipOrder}>
				<Field.Field>
					<Field.Label for="ship-carrier">Carrier</Field.Label>
					<Input id="ship-carrier" bind:value={shipCarrier} placeholder="e.g. FedEx" required />
				</Field.Field>

				<Field.Field>
					<Field.Label for="ship-tracking">Tracking number</Field.Label>
					<Input
						id="ship-tracking"
						bind:value={shipTracking}
						placeholder="Tracking number"
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
						Cancel
					</Button>
					<Button type="submit" disabled={shipping}>
						<Truck class="size-4" />
						{shipping ? 'Creating…' : 'Create shipment'}
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<Card.Root>
		<Card.Content class="space-y-4 py-10 text-center">
			<p class="text-sm text-muted-foreground">This order could not be found.</p>
			<Button href="/admin/orders">Back to orders</Button>
		</Card.Content>
	</Card.Root>
{/if}

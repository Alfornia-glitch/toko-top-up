<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { ArrowLeft, LoaderCircle, Package, Save } from '@lucide/svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';

	type ReturnImage = {
		id: string;
		url: string;
	};

	type ReturnDetail = {
		id: string;
		orderId: string;
		orderNumber: string;
		orderItemId: string;
		productName: string;
		sku: string;
		quantity: number;
		unitPriceCents: number;
		userId: string | null;
		customerName: string | null;
		customerEmail: string | null;
		type: string;
		reason: string;
		note: string | null;
		status: string;
		resolution: string | null;
		refundAmountCents: number | null;
		exchangeVariantId: string | null;
		pickupAddressJson: unknown;
		resolvedBy: string | null;
		resolvedAt: string | null;
		createdAt: string;
		updatedAt: string;
		images: ReturnImage[];
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

	type ReturnAction = {
		label: string;
		next: string;
		variant?: 'default' | 'destructive' | 'outline';
	};

	const ACTIONS: Record<string, ReturnAction[]> = {
		requested: [
			{ label: 'Approve', next: 'approved' },
			{ label: 'Reject', next: 'rejected', variant: 'destructive' }
		],
		approved: [
			{ label: 'Mark received', next: 'received' },
			{ label: 'Reject', next: 'rejected', variant: 'destructive' }
		],
		received: [
			{ label: 'Refund', next: 'refunded' },
			{ label: 'Complete', next: 'completed' }
		],
		refunded: [{ label: 'Complete', next: 'completed' }]
	};

	let request = $state<ReturnDetail | null>(null);
	let loading = $state(true);
	let error = $state('');
	let actionError = $state('');

	let resolution = $state('none');
	let refundAmount = $state('');
	let note = $state('');
	let exchangeVariantId = $state('');

	let savingDetails = $state(false);
	let savingAction = $state('');

	onMount(() => {
		void load(page.params.id);
	});

	async function load(id: string | undefined) {
		if (!id) {
			error = 'Return not found.';
			loading = false;
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/admin/returns/${id}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load return');

			request = payload.data as ReturnDetail;
			syncForm(request);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load return';
		} finally {
			loading = false;
		}
	}

	function syncForm(value: ReturnDetail) {
		resolution = value.resolution ?? 'none';
		refundAmount =
			value.refundAmountCents === null ? '' : (value.refundAmountCents / 100).toFixed(2);
		note = value.note ?? '';
		exchangeVariantId = value.exchangeVariantId ?? '';
	}

	function parseRefundCents(raw: string): number | null {
		const trimmed = raw.trim();
		if (!trimmed) return null;

		const value = Number(trimmed);
		if (!Number.isFinite(value) || value < 0) return null;

		return Math.round(value * 100);
	}

	function buildResolutionBody() {
		return {
			resolution: resolution === 'none' ? null : resolution,
			refundAmountCents: parseRefundCents(refundAmount),
			note: note.trim() || null,
			...(request?.type === 'exchange'
				? { exchangeVariantId: exchangeVariantId.trim() || null }
				: {})
		};
	}

	async function saveDetails(event: SubmitEvent) {
		event.preventDefault();
		if (!request) return;

		actionError = '';

		if (refundAmount.trim() && parseRefundCents(refundAmount) === null) {
			actionError = 'Enter a valid refund amount.';
			return;
		}

		savingDetails = true;

		try {
			const response = await fetch(`/api/admin/returns/${request.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(buildResolutionBody())
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not update return');

			await load(request.id);
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Could not update return';
		} finally {
			savingDetails = false;
		}
	}

	async function applyStatus(next: string) {
		if (!request) return;

		actionError = '';

		let refundAmountCents: number | null = null;

		if (next === 'refunded') {
			refundAmountCents = parseRefundCents(refundAmount);

			if (refundAmountCents === null || !refundAmount.trim()) {
				actionError = 'Enter a refund amount before marking this return as refunded.';
				return;
			}
		}

		savingAction = next;

		try {
			const body: Record<string, unknown> = { status: next };

			if (next === 'refunded') {
				body.refundAmountCents = refundAmountCents;
				body.resolution = resolution === 'none' ? null : resolution;

				if (note.trim()) body.note = note.trim();
				if (request.type === 'exchange') {
					body.exchangeVariantId = exchangeVariantId.trim() || null;
				}
			}

			const response = await fetch(`/api/admin/returns/${request.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not update return');

			await load(request.id);
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Could not update return';
		} finally {
			savingAction = '';
		}
	}

	const actions = $derived(request ? (ACTIONS[request.status] ?? []) : []);

	const pickupAddress = $derived(request ? parseAddress(request.pickupAddressJson) : null);

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

	function formatMoney(cents: number, currency = 'USD') {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
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

	function formatType(value: string) {
		return value === 'exchange' ? 'Exchange' : 'Return';
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
				<Button variant="outline" href="/admin/returns">
					<ArrowLeft class="size-4" />
					Back to returns
				</Button>
				<Button onclick={() => void load(page.params.id)}>Try again</Button>
			</div>
		</Card.Content>
	</Card.Root>
{:else if request}
	<div class="space-y-6">
		<div class="space-y-2">
			<Button variant="ghost" size="sm" href="/admin/returns">
				<ArrowLeft class="size-4" />
				Back to returns
			</Button>
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-2xl font-semibold tracking-tight">
					{formatType(request.type)} #{request.id.slice(0, 8)}
				</h1>
				<StatusBadge status={request.status} />
				<StatusBadge status={request.type} />
			</div>
			<p class="text-sm text-muted-foreground">
				Order
				<a href={`/admin/orders/${request.orderId}`} class="font-medium hover:underline">
					{request.orderNumber}
				</a>
				· Requested {formatDate(request.createdAt)}
			</p>
		</div>

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
					<Card.Title>Request</Card.Title>
					<Card.Description>Current lifecycle and resolution.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-2 text-sm">
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">Status</span>
						<StatusBadge status={request.status} />
					</div>
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">Type</span>
						<span class="font-medium">{formatType(request.type)}</span>
					</div>
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">Resolution</span>
						<span class="font-medium capitalize">{request.resolution ?? '—'}</span>
					</div>
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">Refund</span>
						<span class="font-medium">
							{request.refundAmountCents === null ? '—' : formatMoney(request.refundAmountCents)}
						</span>
					</div>
					<Separator />
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">Resolved at</span>
						<span>{formatDate(request.resolvedAt)}</span>
					</div>
					{#if request.resolvedBy}
						<div class="flex items-center justify-between gap-2">
							<span class="text-muted-foreground">Resolved by</span>
							<span class="truncate text-xs">{request.resolvedBy}</span>
						</div>
					{/if}
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">Updated</span>
						<span>{formatDate(request.updatedAt)}</span>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Customer</Card.Title>
					<Card.Description>Who requested this return.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-1 text-sm">
					<p class="font-medium">{request.customerName ?? 'Unnamed customer'}</p>
					<p class="text-muted-foreground">{request.customerEmail ?? 'No email'}</p>
					{#if request.userId}
						<p class="text-xs text-muted-foreground">ID: {request.userId}</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Order</Card.Title>
					<Card.Description>Original purchase details.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-2 text-sm">
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">Order</span>
						<a href={`/admin/orders/${request.orderId}`} class="font-medium hover:underline">
							{request.orderNumber}
						</a>
					</div>
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">Item ID</span>
						<span class="truncate text-xs">{request.orderItemId}</span>
					</div>
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">Requested</span>
						<span>{formatDate(request.createdAt)}</span>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Item</Card.Title>
					<Card.Description>Product tied to this request.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="flex items-center gap-3">
						<div
							class="flex size-12 items-center justify-center rounded-md border bg-muted text-muted-foreground"
						>
							<Package class="size-5" />
						</div>
						<div class="min-w-0">
							<p class="font-medium">{request.productName}</p>
							<code class="text-xs text-muted-foreground">{request.sku}</code>
						</div>
					</div>
					<div class="grid gap-2 text-sm sm:grid-cols-3">
						<div>
							<p class="text-muted-foreground">Quantity</p>
							<p class="font-medium">{request.quantity}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Unit price</p>
							<p class="font-medium">{formatMoney(request.unitPriceCents)}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Refund</p>
							<p class="font-medium">
								{request.refundAmountCents === null ? '—' : formatMoney(request.refundAmountCents)}
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Reason</Card.Title>
					<Card.Description>Customer-provided context.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3 text-sm">
					<div>
						<p class="text-muted-foreground">Reason</p>
						<p class="whitespace-pre-line">{request.reason}</p>
					</div>
					{#if request.note}
						<div>
							<p class="text-muted-foreground">Note</p>
							<p class="whitespace-pre-line">{request.note}</p>
						</div>
					{/if}
					{#if request.exchangeVariantId}
						<div>
							<p class="text-muted-foreground">Exchange variant</p>
							<code class="text-xs">{request.exchangeVariantId}</code>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		{#if request.images.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Evidence</Card.Title>
					<Card.Description>Images attached by the customer.</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-wrap gap-3">
						{#each request.images as image (image.id)}
							<a
								href={image.url}
								target="_blank"
								rel="noreferrer"
								class="block overflow-hidden rounded-lg border"
							>
								<img
									src={image.url}
									alt="Return evidence"
									class="size-24 object-cover"
									loading="lazy"
								/>
							</a>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		{#if pickupAddress}
			<Card.Root>
				<Card.Header>
					<Card.Title>Pickup address</Card.Title>
				</Card.Header>
				<Card.Content>
					<address class="space-y-0.5 text-sm text-muted-foreground not-italic">
						{#if pickupAddress.recipientName}
							<p class="font-medium text-foreground">{pickupAddress.recipientName}</p>
						{/if}
						{#if pickupAddress.line1}<p>{pickupAddress.line1}</p>{/if}
						{#if pickupAddress.line2}<p>{pickupAddress.line2}</p>{/if}
						{#if addressLine(pickupAddress)}<p>{addressLine(pickupAddress)}</p>{/if}
						{#if pickupAddress.country}<p>{pickupAddress.country}</p>{/if}
						{#if pickupAddress.phone}<p>{pickupAddress.phone}</p>{/if}
					</address>
				</Card.Content>
			</Card.Root>
		{/if}

		<Card.Root>
			<Card.Header>
				<Card.Title>Resolution</Card.Title>
				<Card.Description>Set the resolution, refund amount and internal note.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form class="grid gap-4" onsubmit={saveDetails}>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="return-resolution">Resolution</Field.Label>
							<Select.Root type="single" bind:value={resolution}>
								<Select.Trigger id="return-resolution" class="w-full">
									<Select.Value placeholder="No resolution" />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="none" label="No resolution">No resolution</Select.Item>
									<Select.Item value="original_payment" label="Original payment">
										Original payment
									</Select.Item>
									<Select.Item value="gift_card" label="Gift card">Gift card</Select.Item>
									<Select.Item value="card" label="Card">Card</Select.Item>
								</Select.Content>
							</Select.Root>
						</Field.Field>

						<Field.Field>
							<Field.Label for="return-refund">Refund amount</Field.Label>
							<Input
								id="return-refund"
								type="number"
								min="0"
								step="0.01"
								bind:value={refundAmount}
								placeholder="0.00"
							/>
							<Field.Description
								>Amount in {request.type === 'exchange' ? 'store' : 'order'} currency.</Field.Description
							>
						</Field.Field>
					</div>

					{#if request.type === 'exchange'}
						<Field.Field>
							<Field.Label for="return-exchange-variant">Exchange variant ID</Field.Label>
							<Input
								id="return-exchange-variant"
								bind:value={exchangeVariantId}
								placeholder="Variant ID"
							/>
						</Field.Field>
					{/if}

					<Field.Field>
						<Field.Label for="return-note">Internal note</Field.Label>
						<Textarea id="return-note" bind:value={note} placeholder="Optional note" rows={3} />
					</Field.Field>

					<div class="flex flex-wrap items-center justify-between gap-2">
						<p class="text-xs text-muted-foreground">
							Saving details does not change the return status.
						</p>
						<Button type="submit" variant="outline" disabled={savingDetails}>
							<Save class="size-4" />
							{savingDetails ? 'Saving…' : 'Save details'}
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Actions</Card.Title>
				<Card.Description>
					{#if actions.length > 0}
						Available transitions from the current status.
					{:else}
						This return has reached a final state.
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-wrap gap-2">
				{#if actions.length === 0}
					<p class="text-sm text-muted-foreground">No further actions are available.</p>
				{:else}
					{#each actions as action (action.next)}
						<Button
							variant={action.variant ?? 'default'}
							disabled={savingAction !== ''}
							onclick={() => void applyStatus(action.next)}
						>
							{savingAction === action.next ? 'Working…' : action.label}
						</Button>
					{/each}
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
{:else}
	<Card.Root>
		<Card.Content class="space-y-4 py-10 text-center">
			<p class="text-sm text-muted-foreground">This return could not be found.</p>
			<Button href="/admin/returns">Back to returns</Button>
		</Card.Content>
	</Card.Root>
{/if}

<script lang="ts">
	import { formatDateTime, formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { enumLabel, errorMessage, statusLabel } from '#lib/frontend/i18n/index.ts';
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
		unitPrice: number;
		userId: string | null;
		customerName: string | null;
		customerEmail: string | null;
		type: string;
		reason: string;
		note: string | null;
		status: string;
		resolution: string | null;
		refundAmount: number | null;
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
		next: string;
		variant?: 'default' | 'destructive' | 'outline';
	};

	const ACTIONS: Record<string, ReturnAction[]> = {
		requested: [{ next: 'approved' }, { next: 'rejected', variant: 'destructive' }],
		approved: [{ next: 'received' }, { next: 'rejected', variant: 'destructive' }],
		received: [{ next: 'refunded' }, { next: 'completed' }],
		refunded: [{ next: 'completed' }]
	};

	function actionLabel(next: string): string {
		switch (next) {
			case 'approved':
				return m.admin_ops_return_action_approve();
			case 'rejected':
				return m.admin_ops_return_action_reject();
			case 'received':
				return m.admin_ops_return_action_received();
			case 'refunded':
				return m.admin_ops_return_action_refunded();
			default:
				return m.admin_ops_return_action_completed();
		}
	}

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
			error = m.admin_ops_return_not_found_short();
			loading = false;
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/admin/returns/${id}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_return_load_failed'));

			request = payload.data as ReturnDetail;
			syncForm(request);
		} catch (err) {
			error = errorMessage(err, 'admin_ops_return_load_failed');
		} finally {
			loading = false;
		}
	}

	function syncForm(value: ReturnDetail) {
		resolution = value.resolution ?? 'none';
		refundAmount = value.refundAmount === null ? '' : String(value.refundAmount);
		note = value.note ?? '';
		exchangeVariantId = value.exchangeVariantId ?? '';
	}

	function parseRefund(raw: string): number | null {
		const trimmed = raw.trim();
		if (!trimmed) return null;

		const value = Number(trimmed);
		if (!Number.isFinite(value) || value < 0) return null;

		return Math.round(value);
	}

	function buildResolutionBody() {
		return {
			resolution: resolution === 'none' ? null : resolution,
			refundAmount: parseRefund(refundAmount),
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

		if (refundAmount.trim() && parseRefund(refundAmount) === null) {
			actionError = m.admin_ops_return_invalid_refund();
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

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_return_update_failed'));

			await load(request.id);
		} catch (err) {
			actionError = errorMessage(err, 'admin_ops_return_update_failed');
		} finally {
			savingDetails = false;
		}
	}

	async function applyStatus(next: string) {
		if (!request) return;

		actionError = '';

		let refundValue: number | null = null;

		if (next === 'refunded') {
			refundValue = parseRefund(refundAmount);

			if (refundValue === null) {
				actionError = m.admin_ops_return_refund_required();
				return;
			}
		}

		savingAction = next;

		try {
			const body: Record<string, unknown> = { status: next };

			if (next === 'refunded') {
				body.refundAmount = refundValue;
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

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_return_update_failed'));

			await load(request.id);
		} catch (err) {
			actionError = errorMessage(err, 'admin_ops_return_update_failed');
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

	function formatDate(value: string | null) {
		return formatDateTime(value) || '—';
	}

	function formatType(value: string) {
		return enumLabel('return_type', value === 'exchange' ? 'exchange' : 'return');
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
					{m.admin_ops_return_back()}
				</Button>
				<Button onclick={() => void load(page.params.id)}>{m.common_retry()}</Button>
			</div>
		</Card.Content>
	</Card.Root>
{:else if request}
	<div class="space-y-6">
		<div class="space-y-2">
			<Button variant="ghost" size="sm" href="/admin/returns">
				<ArrowLeft class="size-4" />
				{m.admin_ops_return_back()}
			</Button>
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-2xl font-semibold tracking-tight">
					{m.admin_ops_return_heading({
						type: formatType(request.type),
						id: request.id.slice(0, 8)
					})}
				</h1>
				<StatusBadge kind="return" status={request.status} />
				<StatusBadge kind="return_type" status={request.type} />
			</div>
			<p class="text-sm text-muted-foreground">
				{m.common_order()}
				<a href={`/admin/orders/${request.orderId}`} class="font-medium hover:underline">
					{request.orderNumber}
				</a>
				· {m.admin_ops_return_requested()}
				{formatDate(request.createdAt)}
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
					<Card.Title>{m.admin_ops_return_request()}</Card.Title>
					<Card.Description>{m.admin_ops_return_request_desc()}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-2 text-sm">
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">{m.common_status()}</span>
						<StatusBadge kind="return" status={request.status} />
					</div>
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">{m.admin_ops_returns_type()}</span>
						<span class="font-medium">{formatType(request.type)}</span>
					</div>
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">{m.admin_ops_return_resolution()}</span>
						<span class="font-medium">
							{request.resolution ? enumLabel('return_resolution', request.resolution) : '—'}
						</span>
					</div>
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">{m.admin_ops_returns_col_refund()}</span>
						<span class="font-medium">
							{request.refundAmount === null ? '—' : formatMoney(request.refundAmount)}
						</span>
					</div>
					<Separator />
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">{m.admin_ops_return_resolved_at()}</span>
						<span>{formatDate(request.resolvedAt)}</span>
					</div>
					{#if request.resolvedBy}
						<div class="flex items-center justify-between gap-2">
							<span class="text-muted-foreground">{m.admin_ops_return_resolved_by()}</span>
							<span class="truncate text-xs">{request.resolvedBy}</span>
						</div>
					{/if}
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">{m.admin_ops_return_updated()}</span>
						<span>{formatDate(request.updatedAt)}</span>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{m.common_customer()}</Card.Title>
					<Card.Description>{m.admin_ops_return_customer_desc()}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-1 text-sm">
					<p class="font-medium">{request.customerName ?? m.admin_ops_return_unnamed()}</p>
					<p class="text-muted-foreground">
						{request.customerEmail ?? m.admin_ops_return_no_email()}
					</p>
					{#if request.userId}
						<p class="text-xs text-muted-foreground">
							{m.admin_ops_return_user_id({ id: request.userId })}
						</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{m.common_order()}</Card.Title>
					<Card.Description>{m.admin_ops_return_order_desc()}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-2 text-sm">
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">{m.common_order()}</span>
						<a href={`/admin/orders/${request.orderId}`} class="font-medium hover:underline">
							{request.orderNumber}
						</a>
					</div>
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">{m.admin_ops_return_item_id()}</span>
						<span class="truncate text-xs">{request.orderItemId}</span>
					</div>
					<div class="flex items-center justify-between gap-2">
						<span class="text-muted-foreground">{m.admin_ops_return_requested()}</span>
						<span>{formatDate(request.createdAt)}</span>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>{m.admin_ops_return_item()}</Card.Title>
					<Card.Description>{m.admin_ops_return_item_desc()}</Card.Description>
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
							<p class="text-muted-foreground">{m.common_quantity()}</p>
							<p class="font-medium">{request.quantity}</p>
						</div>
						<div>
							<p class="text-muted-foreground">{m.admin_ops_return_unit_price()}</p>
							<p class="font-medium">{formatMoney(request.unitPrice)}</p>
						</div>
						<div>
							<p class="text-muted-foreground">{m.admin_ops_returns_col_refund()}</p>
							<p class="font-medium">
								{request.refundAmount === null ? '—' : formatMoney(request.refundAmount)}
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{m.admin_ops_return_reason()}</Card.Title>
					<Card.Description>{m.admin_ops_return_reason_desc()}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3 text-sm">
					<div>
						<p class="text-muted-foreground">{m.admin_ops_return_reason()}</p>
						<p class="whitespace-pre-line">{request.reason}</p>
					</div>
					{#if request.note}
						<div>
							<p class="text-muted-foreground">{m.admin_ops_return_note()}</p>
							<p class="whitespace-pre-line">{request.note}</p>
						</div>
					{/if}
					{#if request.exchangeVariantId}
						<div>
							<p class="text-muted-foreground">{m.admin_ops_return_exchange_variant()}</p>
							<code class="text-xs">{request.exchangeVariantId}</code>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		{#if request.images.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>{m.admin_ops_return_evidence()}</Card.Title>
					<Card.Description>{m.admin_ops_return_evidence_desc()}</Card.Description>
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
									alt={m.admin_ops_return_evidence_alt()}
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
					<Card.Title>{m.admin_ops_return_pickup_address()}</Card.Title>
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
				<Card.Title>{m.admin_ops_return_resolution()}</Card.Title>
				<Card.Description>{m.admin_ops_return_resolution_desc()}</Card.Description>
			</Card.Header>
			<Card.Content>
				<form class="grid gap-4" onsubmit={saveDetails}>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="return-resolution">{m.admin_ops_return_resolution()}</Field.Label>
							<Select.Root type="single" bind:value={resolution}>
								<Select.Trigger id="return-resolution" class="w-full">
									<Select.Value placeholder={m.admin_ops_return_no_resolution()} />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="none" label={m.admin_ops_return_no_resolution()}>
										{m.admin_ops_return_no_resolution()}
									</Select.Item>
									{#each ['original_payment', 'gift_card', 'card'] as option (option)}
										<Select.Item value={option} label={enumLabel('return_resolution', option)}>
											{enumLabel('return_resolution', option)}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</Field.Field>

						<Field.Field>
							<Field.Label for="return-refund">{m.admin_ops_return_refund_amount()}</Field.Label>
							<Input
								id="return-refund"
								type="number"
								min="0"
								step="0.01"
								bind:value={refundAmount}
								placeholder="0.00"
							/>
							<Field.Description>
								{request.type === 'exchange'
									? m.admin_ops_return_amount_store_currency()
									: m.admin_ops_return_amount_order_currency()}
							</Field.Description>
						</Field.Field>
					</div>

					{#if request.type === 'exchange'}
						<Field.Field>
							<Field.Label for="return-exchange-variant"
								>{m.admin_ops_return_exchange_variant_id()}</Field.Label
							>
							<Input
								id="return-exchange-variant"
								bind:value={exchangeVariantId}
								placeholder={m.admin_ops_return_variant_id_placeholder()}
							/>
						</Field.Field>
					{/if}

					<Field.Field>
						<Field.Label for="return-note">{m.admin_ops_return_internal_note()}</Field.Label>
						<Textarea
							id="return-note"
							bind:value={note}
							placeholder={m.admin_ops_return_note_placeholder()}
							rows={3}
						/>
					</Field.Field>

					<div class="flex flex-wrap items-center justify-between gap-2">
						<p class="text-xs text-muted-foreground">
							{m.admin_ops_return_save_hint()}
						</p>
						<Button type="submit" variant="outline" disabled={savingDetails}>
							<Save class="size-4" />
							{savingDetails ? m.common_saving() : m.admin_ops_return_save_details()}
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{m.admin_ops_return_actions()}</Card.Title>
				<Card.Description>
					{#if actions.length > 0}
						{m.admin_ops_return_actions_available()}
					{:else}
						{m.admin_ops_return_actions_final()}
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-wrap gap-2">
				{#if actions.length === 0}
					<p class="text-sm text-muted-foreground">{m.admin_ops_return_no_actions()}</p>
				{:else}
					{#each actions as action (action.next)}
						<Button
							variant={action.variant ?? 'default'}
							disabled={savingAction !== ''}
							onclick={() => void applyStatus(action.next)}
						>
							{savingAction === action.next
								? m.admin_ops_return_working()
								: actionLabel(action.next)}
						</Button>
					{/each}
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
{:else}
	<Card.Root>
		<Card.Content class="space-y-4 py-10 text-center">
			<p class="text-sm text-muted-foreground">{m.admin_ops_return_not_found()}</p>
			<Button href="/admin/returns">{m.admin_ops_return_back()}</Button>
		</Card.Content>
	</Card.Root>
{/if}

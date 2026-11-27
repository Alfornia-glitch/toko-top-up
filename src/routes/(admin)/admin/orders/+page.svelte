<script lang="ts">
	import { formatDateTime, formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, statusLabel } from '#lib/frontend/i18n/index.ts';
	import { onDestroy, onMount } from 'svelte';
	import { ShoppingCart } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';

	type OrderRow = {
		id: string;
		orderNumber: string;
		status: string;
		paymentStatus: string;
		fulfillmentStatus: string;
		grandTotal: number;
		currency: string;
		placedAt: string;
		updatedAt: string;
		customerName: string | null;
		customerEmail: string | null;
	};

	const columns = $derived([
		{ key: 'orderNumber', label: m.common_order(), sortable: true },
		{ key: 'customer', label: m.common_customer() },
		{ key: 'status', label: m.common_status() },
		{ key: 'paymentStatus', label: m.common_payment() },
		{ key: 'fulfillmentStatus', label: m.admin_ops_orders_col_fulfillment() },
		{ key: 'total', label: m.common_total(), sortable: true, class: 'text-right' },
		{ key: 'placedAt', label: m.admin_ops_orders_col_placed(), sortable: true }
	]);

	const orderStatuses = [
		'pending',
		'paid',
		'processing',
		'shipped',
		'delivered',
		'cancelled',
		'refunded'
	];
	const paymentStatuses = ['pending', 'paid', 'refunded'];
	const fulfillmentStatuses = ['unfulfilled', 'partial', 'fulfilled'];

	const pageSize = 25;

	let orders = $state<OrderRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	let q = $state('');
	let statusFilter = $state('all');
	let paymentFilter = $state('all');
	let fulfillmentFilter = $state('all');

	let page = $state(1);
	let total = $state(0);
	let sortKey = $state('placedAt');
	let sortDir = $state<'asc' | 'desc'>('desc');

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		void loadOrders();
	});

	onDestroy(() => {
		if (searchTimer) clearTimeout(searchTimer);
	});

	async function loadOrders() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams();
			params.set('page', String(page));
			params.set('pageSize', String(pageSize));
			params.set('sort', `${sortDir === 'desc' ? '-' : ''}${sortKey}`);

			if (q.trim()) params.set('q', q.trim());
			if (statusFilter !== 'all') params.set('status', statusFilter);
			if (paymentFilter !== 'all') params.set('paymentStatus', paymentFilter);
			if (fulfillmentFilter !== 'all') params.set('fulfillmentStatus', fulfillmentFilter);

			const response = await fetch(`/api/admin/orders?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_orders_load_failed'));

			orders = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = errorMessage(err, 'admin_ops_orders_load_failed');
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		if (searchTimer) clearTimeout(searchTimer);

		searchTimer = setTimeout(() => {
			page = 1;
			void loadOrders();
		}, 300);
	}

	function handleStatusChange(value: string) {
		statusFilter = value;
		page = 1;
		void loadOrders();
	}

	function handlePaymentChange(value: string) {
		paymentFilter = value;
		page = 1;
		void loadOrders();
	}

	function handleFulfillmentChange(value: string) {
		fulfillmentFilter = value;
		page = 1;
		void loadOrders();
	}

	function handleSort(key: string) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}

		page = 1;
		void loadOrders();
	}

	function handlePageChange(nextPage: number) {
		page = nextPage;
		void loadOrders();
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.common_orders()}</h1>
			<p class="text-sm text-muted-foreground">{m.admin_ops_orders_subtitle()}</p>
		</div>
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<ShoppingCart class="size-4" />
			<span>{m.admin_ops_orders_total({ count: total })}</span>
		</div>
	</div>

	{#if error}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
			role="alert"
		>
			{error}
		</div>
	{/if}

	<Card.Root>
		<Card.Content class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<div class="space-y-1.5">
				<Label for="order-search">{m.common_search()}</Label>
				<Input
					id="order-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder={m.admin_ops_orders_search_placeholder()}
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="order-status-filter">{m.common_status()}</Label>
				<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
					<Select.Trigger id="order-status-filter" class="w-full">
						<Select.Value placeholder={m.common_all_statuses()} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label={m.common_all_statuses()}
							>{m.common_all_statuses()}</Select.Item
						>
						{#each orderStatuses as option (option)}
							<Select.Item value={option} label={statusLabel('order', option)}>
								{statusLabel('order', option)}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-1.5">
				<Label for="order-payment-filter">{m.common_payment()}</Label>
				<Select.Root type="single" value={paymentFilter} onValueChange={handlePaymentChange}>
					<Select.Trigger id="order-payment-filter" class="w-full">
						<Select.Value placeholder={m.admin_ops_orders_all_payments()} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label={m.admin_ops_orders_all_payments()}>
							{m.admin_ops_orders_all_payments()}
						</Select.Item>
						{#each paymentStatuses as option (option)}
							<Select.Item value={option} label={statusLabel('payment', option)}>
								{statusLabel('payment', option)}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-1.5">
				<Label for="order-fulfillment-filter">{m.admin_ops_orders_col_fulfillment()}</Label>
				<Select.Root
					type="single"
					value={fulfillmentFilter}
					onValueChange={handleFulfillmentChange}
				>
					<Select.Trigger id="order-fulfillment-filter" class="w-full">
						<Select.Value placeholder={m.admin_ops_orders_all_fulfillment()} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label={m.admin_ops_orders_all_fulfillment()}>
							{m.admin_ops_orders_all_fulfillment()}
						</Select.Item>
						{#each fulfillmentStatuses as option (option)}
							<Select.Item value={option} label={statusLabel('fulfillment', option)}>
								{statusLabel('fulfillment', option)}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={orders as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage={m.admin_ops_orders_empty()}
		{page}
		{pageSize}
		{total}
		{sortKey}
		{sortDir}
		onSort={handleSort}
		onPageChange={handlePageChange}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'orderNumber'}
				<a href={`/admin/orders/${String(row.id)}`} class="font-medium hover:underline">
					{String(row.orderNumber ?? '')}
				</a>
			{:else if column.key === 'customer'}
				<div class="min-w-0">
					<p class="truncate">{String(row.customerName ?? m.admin_ops_guest())}</p>
					{#if row.customerEmail}
						<p class="truncate text-xs text-muted-foreground">{String(row.customerEmail)}</p>
					{/if}
				</div>
			{:else if column.key === 'status'}
				<StatusBadge kind="order" status={String(row.status ?? '')} />
			{:else if column.key === 'paymentStatus'}
				<StatusBadge kind="payment" status={String(row.paymentStatus ?? '')} />
			{:else if column.key === 'fulfillmentStatus'}
				<StatusBadge kind="fulfillment" status={String(row.fulfillmentStatus ?? '')} />
			{:else if column.key === 'total'}
				<span class="font-medium">
					{formatMoney(Number(row.grandTotal ?? 0), String(row.currency ?? 'IDR'))}
				</span>
			{:else if column.key === 'placedAt'}
				<span class="text-muted-foreground"
					>{formatDateTime(String(row.placedAt ?? '')) || '—'}</span
				>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

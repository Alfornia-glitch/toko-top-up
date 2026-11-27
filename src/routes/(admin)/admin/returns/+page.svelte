<script lang="ts">
	import { formatDateTime, formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, statusLabel } from '#lib/frontend/i18n/index.ts';
	import { onDestroy, onMount } from 'svelte';
	import { RotateCcw } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';

	type ReturnRow = {
		id: string;
		orderId: string;
		orderNumber: string;
		orderItemId: string;
		productName: string;
		sku: string;
		userId: string | null;
		customerEmail: string | null;
		type: string;
		reason: string;
		status: string;
		resolution: string | null;
		refundAmount: number | null;
		createdAt: string;
		updatedAt: string;
	};

	const columns = $derived([
		{ key: 'id', label: m.admin_ops_returns_col_return() },
		{ key: 'orderNumber', label: m.common_order() },
		{ key: 'productName', label: m.common_product() },
		{ key: 'customer', label: m.common_customer() },
		{ key: 'type', label: m.admin_ops_returns_type() },
		{ key: 'status', label: m.common_status() },
		{ key: 'refundAmount', label: m.admin_ops_returns_col_refund(), class: 'text-right' },
		{ key: 'createdAt', label: m.admin_ops_returns_col_created() }
	]);

	const returnStatuses = ['requested', 'approved', 'rejected', 'received', 'refunded', 'completed'];

	const pageSize = 25;

	let requests = $state<ReturnRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	let q = $state('');
	let statusFilter = $state('all');
	let typeFilter = $state('all');

	let page = $state(1);
	let total = $state(0);

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		void loadReturns();
	});

	onDestroy(() => {
		if (searchTimer) clearTimeout(searchTimer);
	});

	async function loadReturns() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams();
			params.set('page', String(page));
			params.set('pageSize', String(pageSize));

			if (q.trim()) params.set('q', q.trim());
			if (statusFilter !== 'all') params.set('status', statusFilter);
			if (typeFilter !== 'all') params.set('type', typeFilter);

			const response = await fetch(`/api/admin/returns?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_returns_load_failed'));

			requests = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = errorMessage(err, 'admin_ops_returns_load_failed');
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		if (searchTimer) clearTimeout(searchTimer);

		searchTimer = setTimeout(() => {
			page = 1;
			void loadReturns();
		}, 300);
	}

	function handleStatusChange(value: string) {
		statusFilter = value;
		page = 1;
		void loadReturns();
	}

	function handleTypeChange(value: string) {
		typeFilter = value;
		page = 1;
		void loadReturns();
	}

	function handlePageChange(nextPage: number) {
		page = nextPage;
		void loadReturns();
	}

	function formatDate(value: string) {
		return formatDateTime(value) || '—';
	}

	function shortId(value: string) {
		return value.slice(0, 8);
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.admin_ops_returns_title()}</h1>
			<p class="text-sm text-muted-foreground">{m.admin_ops_returns_subtitle()}</p>
		</div>
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<RotateCcw class="size-4" />
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
		<Card.Content class="grid gap-3 sm:grid-cols-3">
			<div class="space-y-1.5">
				<Label for="return-search">{m.common_search()}</Label>
				<Input
					id="return-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder={m.admin_ops_returns_search_placeholder()}
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="return-status-filter">{m.common_status()}</Label>
				<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
					<Select.Trigger id="return-status-filter" class="w-full">
						<Select.Value placeholder={m.common_all_statuses()} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label={m.common_all_statuses()}>
							{m.common_all_statuses()}
						</Select.Item>
						{#each returnStatuses as option (option)}
							<Select.Item value={option} label={statusLabel('return', option)}>
								{statusLabel('return', option)}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-1.5">
				<Label for="return-type-filter">{m.admin_ops_returns_type()}</Label>
				<Select.Root type="single" value={typeFilter} onValueChange={handleTypeChange}>
					<Select.Trigger id="return-type-filter" class="w-full">
						<Select.Value placeholder={m.admin_ops_returns_all_types()} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label={m.admin_ops_returns_all_types()}>
							{m.admin_ops_returns_all_types()}
						</Select.Item>
						{#each ['return', 'exchange'] as option (option)}
							<Select.Item value={option} label={statusLabel('return_type', option)}>
								{statusLabel('return_type', option)}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={requests as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage={m.admin_ops_returns_empty()}
		{page}
		{pageSize}
		{total}
		onPageChange={handlePageChange}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'id'}
				<a
					href={`/admin/returns/${String(row.id)}`}
					class="font-medium hover:underline"
					title={String(row.id)}
				>
					#{shortId(String(row.id ?? ''))}
				</a>
			{:else if column.key === 'orderNumber'}
				<a href={`/admin/orders/${String(row.orderId)}`} class="hover:underline">
					{String(row.orderNumber ?? '')}
				</a>
			{:else if column.key === 'productName'}
				<div class="min-w-0">
					<p class="max-w-56 truncate">{String(row.productName ?? '—')}</p>
					{#if row.sku}
						<p class="text-xs text-muted-foreground">{String(row.sku)}</p>
					{/if}
				</div>
			{:else if column.key === 'customer'}
				<span class="text-muted-foreground">{String(row.customerEmail ?? m.admin_ops_guest())}</span
				>
			{:else if column.key === 'type'}
				<StatusBadge kind="return_type" status={String(row.type ?? '')} />
			{:else if column.key === 'status'}
				<StatusBadge kind="return" status={String(row.status ?? '')} />
			{:else if column.key === 'refundAmount'}
				{#if row.refundAmount === null || row.refundAmount === undefined}
					<span class="text-muted-foreground">—</span>
				{:else}
					<span class="font-medium">{formatMoney(Number(row.refundAmount))}</span>
				{/if}
			{:else if column.key === 'createdAt'}
				<span class="text-muted-foreground">{formatDate(String(row.createdAt ?? ''))}</span>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

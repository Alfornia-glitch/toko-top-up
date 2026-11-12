<script lang="ts">
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
		refundAmountCents: number | null;
		createdAt: string;
		updatedAt: string;
	};

	const columns = [
		{ key: 'id', label: 'Return' },
		{ key: 'orderNumber', label: 'Order' },
		{ key: 'productName', label: 'Product' },
		{ key: 'customer', label: 'Customer' },
		{ key: 'type', label: 'Type' },
		{ key: 'status', label: 'Status' },
		{ key: 'refundAmountCents', label: 'Refund', class: 'text-right' },
		{ key: 'createdAt', label: 'Created' }
	];

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

			if (!response.ok) throw new Error(payload.error ?? 'Could not load returns');

			requests = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load returns';
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

	function formatMoney(cents: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
			cents / 100
		);
	}

	function formatDate(value: string) {
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

	function shortId(value: string) {
		return value.slice(0, 8);
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Returns</h1>
			<p class="text-sm text-muted-foreground">
				Track return and exchange requests through resolution.
			</p>
		</div>
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<RotateCcw class="size-4" />
			<span>{total} total</span>
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
				<Label for="return-search">Search</Label>
				<Input
					id="return-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder="Order number, email or product"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="return-status-filter">Status</Label>
				<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
					<Select.Trigger id="return-status-filter" class="w-full">
						<Select.Value placeholder="All statuses" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label="All statuses">All statuses</Select.Item>
						{#each returnStatuses as option (option)}
							<Select.Item value={option} label={option}>{option}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-1.5">
				<Label for="return-type-filter">Type</Label>
				<Select.Root type="single" value={typeFilter} onValueChange={handleTypeChange}>
					<Select.Trigger id="return-type-filter" class="w-full">
						<Select.Value placeholder="All types" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label="All types">All types</Select.Item>
						<Select.Item value="return" label="Return">Return</Select.Item>
						<Select.Item value="exchange" label="Exchange">Exchange</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={requests as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No return requests match the current filters."
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
				<span class="text-muted-foreground">{String(row.customerEmail ?? 'Guest')}</span>
			{:else if column.key === 'type'}
				<StatusBadge status={String(row.type ?? '')} />
			{:else if column.key === 'status'}
				<StatusBadge status={String(row.status ?? '')} />
			{:else if column.key === 'refundAmountCents'}
				{#if row.refundAmountCents === null || row.refundAmountCents === undefined}
					<span class="text-muted-foreground">—</span>
				{:else}
					<span class="font-medium">{formatMoney(Number(row.refundAmountCents))}</span>
				{/if}
			{:else if column.key === 'createdAt'}
				<span class="text-muted-foreground">{formatDate(String(row.createdAt ?? ''))}</span>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

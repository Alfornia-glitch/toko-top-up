<script lang="ts">
	import { onMount } from 'svelte';
	import { QrCode } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';

	type Row = {
		id: string;
		orderNumber: string | null;
		customerName: string | null;
		totalAmount: number;
		status: string;
		uploadedAt: string | null;
		createdAt: string;
	};

	const columns = [
		{ key: 'orderNumber', label: 'Order' },
		{ key: 'customer', label: 'Customer' },
		{ key: 'total', label: 'Total', class: 'text-right' },
		{ key: 'status', label: 'Status' },
		{ key: 'uploadedAt', label: 'Uploaded' },
		{ key: 'age', label: 'Age' }
	];

	const statuses = ['awaiting_verification', 'pending_payment', 'rejected', 'paid', 'expired'];
	const pageSize = 25;

	let rows = $state<Row[]>([]);
	let loading = $state(true);
	let error = $state('');
	let status = $state('awaiting_verification');
	let page = $state(1);
	let total = $state(0);

	onMount(() => void load());

	async function load() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
			if (status !== 'all') params.set('status', status);

			const response = await fetch(`/api/admin/payments?${params}`);
			const payload = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(payload.error ?? 'Could not load payments');

			rows = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not load payments';
		} finally {
			loading = false;
		}
	}

	function changeStatus(value: string) {
		status = value;
		page = 1;
		void load();
	}

	function changePage(next: number) {
		page = next;
		void load();
	}

	function age(since: string | null): string {
		if (!since) return '—';
		const minutes = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60000));
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		return hours < 24 ? `${hours}h ${minutes % 60}m` : `${Math.floor(hours / 24)}d`;
	}

	function formatDate(value: string | null) {
		if (!value) return '—';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(value));
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Payments</h1>
			<p class="text-sm text-muted-foreground">
				Verify QRIS payment proofs against the bank mutation, oldest first.
			</p>
		</div>
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<QrCode class="size-4" />
			<span>{total} total</span>
		</div>
	</div>

	{#if error}
		<div
			class="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
			role="alert"
		>
			<span>{error}</span>
			<button class="underline" onclick={load}>Retry</button>
		</div>
	{/if}

	<Card.Root>
		<Card.Content class="max-w-xs space-y-1.5 pt-6">
			<Label for="payment-status-filter">Status</Label>
			<Select.Root type="single" value={status} onValueChange={changeStatus}>
				<Select.Trigger id="payment-status-filter" class="w-full">
					<Select.Value placeholder="All statuses" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="all" label="All statuses">All statuses</Select.Item>
					{#each statuses as option (option)}
						<Select.Item value={option} label={option.replaceAll('_', ' ')}>
							{option.replaceAll('_', ' ')}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={rows as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No payments in this state."
		{page}
		{pageSize}
		{total}
		onPageChange={changePage}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'orderNumber'}
				<a href={`/admin/payments/${String(row.id)}`} class="font-medium hover:underline">
					{String(row.orderNumber ?? row.id)}
				</a>
			{:else if column.key === 'customer'}
				{String(row.customerName ?? 'Guest')}
			{:else if column.key === 'total'}
				<span class="font-mono font-semibold">{formatMoney(Number(row.totalAmount), 'IDR')}</span>
			{:else if column.key === 'status'}
				<StatusBadge status={String(row.status)} />
			{:else if column.key === 'uploadedAt'}
				<span class="text-muted-foreground">{formatDate(row.uploadedAt as string | null)}</span>
			{:else if column.key === 'age'}
				<span class="text-muted-foreground">
					{age((row.uploadedAt ?? row.createdAt) as string | null)}
				</span>
			{/if}
		{/snippet}
	</DataTable>
</div>

<script lang="ts">
	import { onMount } from 'svelte';
	import { QrCode } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import {
		formatDateTime,
		formatDuration,
		formatMoney
	} from '#lib/frontend/modules/commerce/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, statusLabel } from '#lib/frontend/i18n/index.ts';

	type Row = {
		id: string;
		orderNumber: string | null;
		customerName: string | null;
		totalAmount: number;
		status: string;
		uploadedAt: string | null;
		createdAt: string;
	};

	const columns = $derived([
		{ key: 'orderNumber', label: m.common_order() },
		{ key: 'customer', label: m.common_customer() },
		{ key: 'total', label: m.common_total(), class: 'text-right' },
		{ key: 'status', label: m.common_status() },
		{ key: 'uploadedAt', label: m.admin_ops_payments_col_uploaded() },
		{ key: 'age', label: m.admin_ops_payments_col_age() }
	]);

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
			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_payments_load_failed'));

			rows = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (cause) {
			error = errorMessage(cause, 'admin_ops_payments_load_failed');
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
		return formatDuration(Date.now() - new Date(since).getTime());
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.admin_ops_payments_title()}</h1>
			<p class="text-sm text-muted-foreground">{m.admin_ops_payments_subtitle()}</p>
		</div>
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<QrCode class="size-4" />
			<span>{m.admin_ops_orders_total({ count: total })}</span>
		</div>
	</div>

	{#if error}
		<div
			class="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
			role="alert"
		>
			<span>{error}</span>
			<button class="underline" onclick={load}>{m.common_retry()}</button>
		</div>
	{/if}

	<Card.Root>
		<Card.Content class="max-w-xs space-y-1.5 pt-6">
			<Label for="payment-status-filter">{m.common_status()}</Label>
			<Select.Root type="single" value={status} onValueChange={changeStatus}>
				<Select.Trigger id="payment-status-filter" class="w-full">
					<Select.Value placeholder={m.common_all_statuses()} />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="all" label={m.common_all_statuses()}>
						{m.common_all_statuses()}
					</Select.Item>
					{#each statuses as option (option)}
						<Select.Item value={option} label={statusLabel('payment', option)}>
							{statusLabel('payment', option)}
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
		emptyMessage={m.admin_ops_payments_empty()}
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
				{String(row.customerName ?? m.admin_ops_guest())}
			{:else if column.key === 'total'}
				<span class="font-mono font-semibold">{formatMoney(Number(row.totalAmount), 'IDR')}</span>
			{:else if column.key === 'status'}
				<StatusBadge kind="payment" status={String(row.status)} />
			{:else if column.key === 'uploadedAt'}
				<span class="text-muted-foreground"
					>{formatDateTime(row.uploadedAt as string | null) || '—'}</span
				>
			{:else if column.key === 'age'}
				<span class="text-muted-foreground">
					{age((row.uploadedAt ?? row.createdAt) as string | null)}
				</span>
			{/if}
		{/snippet}
	</DataTable>
</div>

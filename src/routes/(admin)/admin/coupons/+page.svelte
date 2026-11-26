<script lang="ts">
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { onDestroy, onMount } from 'svelte';
	import { Pencil, Plus, Trash2 } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import ConfirmDialog from '#lib/frontend/components/admin/ConfirmDialog.svelte';
	import CouponDialog from '#lib/frontend/components/admin/marketing/CouponDialog.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';

	type CouponRow = {
		id: string;
		code: string;
		type: 'percentage' | 'fixed';
		value: number;
		minSubtotal: number;
		maxUses: number | null;
		usedCount: number;
		startsAt: string | null;
		endsAt: string | null;
		status: string;
		appliesToJson: Record<string, unknown> | null;
		createdAt: string;
		updatedAt: string;
	};

	const columns = [
		{ key: 'code', label: 'Code' },
		{ key: 'type', label: 'Type' },
		{ key: 'value', label: 'Value', class: 'text-right' },
		{ key: 'minSubtotal', label: 'Min subtotal', class: 'text-right' },
		{ key: 'usage', label: 'Usage', class: 'text-right' },
		{ key: 'status', label: 'Status' },
		{ key: 'endsAt', label: 'Ends' },
		{ key: 'actions', label: '', class: 'text-right' }
	];

	const pageSize = 25;

	let coupons = $state<CouponRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	let q = $state('');
	let statusFilter = $state('all');
	let page = $state(1);
	let total = $state(0);

	let dialogOpen = $state(false);
	let editing = $state<CouponRow | null>(null);
	let deleteOpen = $state(false);
	let deleting = $state<CouponRow | null>(null);

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		void loadCoupons();
	});

	onDestroy(() => {
		if (searchTimer) clearTimeout(searchTimer);
	});

	async function loadCoupons() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams();
			params.set('page', String(page));
			params.set('pageSize', String(pageSize));
			if (q.trim()) params.set('q', q.trim());
			if (statusFilter !== 'all') params.set('status', statusFilter);

			const response = await fetch(`/api/admin/coupons?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load coupons');

			coupons = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load coupons';
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		if (searchTimer) clearTimeout(searchTimer);

		searchTimer = setTimeout(() => {
			page = 1;
			void loadCoupons();
		}, 300);
	}

	function handleStatusChange(value: string) {
		statusFilter = value;
		page = 1;
		void loadCoupons();
	}

	function handlePageChange(nextPage: number) {
		page = nextPage;
		void loadCoupons();
	}

	function openCreate() {
		editing = null;
		dialogOpen = true;
	}

	function openEdit(row: Record<string, unknown>) {
		const item = coupons.find((coupon) => coupon.id === String(row.id));
		if (!item) return;

		editing = item;
		dialogOpen = true;
	}

	function openDelete(row: Record<string, unknown>) {
		const item = coupons.find((coupon) => coupon.id === String(row.id));
		if (!item) return;

		deleting = item;
		deleteOpen = true;
	}

	async function deleteCoupon() {
		if (!deleting) return;

		error = '';

		try {
			const response = await fetch(`/api/admin/coupons/${deleting.id}`, { method: 'DELETE' });
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not delete coupon');

			await loadCoupons();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not delete coupon';
		} finally {
			deleting = null;
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
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Coupons</h1>
			<p class="text-sm text-muted-foreground">Create and manage discount codes.</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="size-4" />
			New coupon
		</Button>
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
		<Card.Content class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="coupon-search">Search</Label>
				<Input
					id="coupon-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder="Search coupon codes"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="coupon-status-filter">Status</Label>
				<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
					<Select.Trigger id="coupon-status-filter" class="w-full">
						<Select.Value placeholder="All statuses" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label="All statuses">All statuses</Select.Item>
						<Select.Item value="active" label="Active">Active</Select.Item>
						<Select.Item value="disabled" label="Disabled">Disabled</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={coupons as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No coupons match the current filters."
		{page}
		{pageSize}
		{total}
		onPageChange={handlePageChange}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'code'}
				<code class="font-medium">{String(row.code ?? '')}</code>
			{:else if column.key === 'type'}
				<span class="capitalize">{String(row.type ?? '')}</span>
			{:else if column.key === 'value'}
				<span class="font-medium">
					{row.type === 'fixed'
						? formatMoney(Number(row.value ?? 0))
						: `${Number(row.value ?? 0)}%`}
				</span>
			{:else if column.key === 'minSubtotal'}
				<span class="text-muted-foreground">
					{formatMoney(Number(row.minSubtotal ?? 0))}
				</span>
			{:else if column.key === 'usage'}
				<span class="text-muted-foreground">
					{Number(row.usedCount ?? 0)}/{row.maxUses ? String(row.maxUses) : '∞'}
				</span>
			{:else if column.key === 'status'}
				<StatusBadge status={String(row.status ?? '')} />
			{:else if column.key === 'endsAt'}
				<span class="text-muted-foreground">{formatDate(row.endsAt as string | null)}</span>
			{:else if column.key === 'actions'}
				<div class="flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Edit coupon"
						onclick={() => openEdit(row)}
					>
						<Pencil class="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						class="text-destructive hover:bg-destructive/10"
						aria-label="Delete coupon"
						onclick={() => openDelete(row)}
					>
						<Trash2 class="size-4" />
					</Button>
				</div>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

{#if dialogOpen}
	<CouponDialog bind:open={dialogOpen} coupon={editing} onsaved={loadCoupons} />
{/if}

<ConfirmDialog
	bind:open={deleteOpen}
	title="Delete coupon"
	description={`Delete “${deleting?.code ?? 'this coupon'}”? Coupons with redemptions cannot be deleted.`}
	confirmLabel="Delete"
	destructive
	onConfirm={deleteCoupon}
/>

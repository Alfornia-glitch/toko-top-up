<script lang="ts">
	import {
		formatDateTime,
		formatMoney,
		formatPercent
	} from '#lib/frontend/modules/commerce/format.ts';
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
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { statusLabel } from '#lib/frontend/i18n/labels.ts';

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

	const columns = $derived([
		{ key: 'code', label: m.admin_catalog_coupons_col_code() },
		{ key: 'type', label: m.admin_catalog_coupons_col_type() },
		{ key: 'value', label: m.admin_catalog_coupons_col_value(), class: 'text-right' },
		{
			key: 'minSubtotal',
			label: m.admin_catalog_coupons_col_min_subtotal(),
			class: 'text-right'
		},
		{ key: 'usage', label: m.admin_catalog_coupons_col_usage(), class: 'text-right' },
		{ key: 'status', label: m.common_status() },
		{ key: 'endsAt', label: m.admin_catalog_coupons_col_ends() },
		{ key: 'actions', label: '', class: 'text-right' }
	]);

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

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_catalog_coupons_load_failed'));

			coupons = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = errorMessage(err, 'admin_catalog_coupons_load_failed');
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

			if (!response.ok)
				throw new Error(errorMessage(payload, 'admin_catalog_coupons_delete_failed'));

			await loadCoupons();
		} catch (err) {
			error = errorMessage(err, 'admin_catalog_coupons_delete_failed');
		} finally {
			deleting = null;
		}
	}

	function formatDate(value: string | null) {
		return formatDateTime(value) || m.common_dash();
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.admin_catalog_coupons_title()}</h1>
			<p class="text-sm text-muted-foreground">{m.admin_catalog_coupons_subtitle()}</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="size-4" />
			{m.admin_catalog_coupons_new()}
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
				<Label for="coupon-search">{m.common_search()}</Label>
				<Input
					id="coupon-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder={m.admin_catalog_coupons_search_placeholder()}
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="coupon-status-filter">{m.common_status()}</Label>
				<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
					<Select.Trigger id="coupon-status-filter" class="w-full">
						<Select.Value placeholder={m.common_all_statuses()} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label={m.common_all_statuses()}>
							{m.common_all_statuses()}
						</Select.Item>
						{#each ['active', 'disabled'] as value (value)}
							<Select.Item {value} label={statusLabel('coupon', value)}>
								{statusLabel('coupon', value)}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={coupons as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage={m.admin_catalog_coupons_empty()}
		{page}
		{pageSize}
		{total}
		onPageChange={handlePageChange}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'code'}
				<code class="font-medium">{String(row.code ?? '')}</code>
			{:else if column.key === 'type'}
				<span>{statusLabel('coupon_type', String(row.type ?? ''))}</span>
			{:else if column.key === 'value'}
				<span class="font-medium">
					{row.type === 'fixed'
						? formatMoney(Number(row.value ?? 0))
						: formatPercent(Number(row.value ?? 0) / 100)}
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
						aria-label={m.admin_catalog_coupons_edit_aria()}
						onclick={() => openEdit(row)}
					>
						<Pencil class="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						class="text-destructive hover:bg-destructive/10"
						aria-label={m.admin_catalog_coupons_delete_aria()}
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
	title={m.admin_catalog_coupons_delete_title()}
	description={m.admin_catalog_coupons_delete_description({
		code: deleting?.code ?? m.admin_catalog_coupons_delete_this()
	})}
	confirmLabel={m.common_delete()}
	cancelLabel={m.common_cancel()}
	destructive
	onConfirm={deleteCoupon}
/>

<script lang="ts">
	import { onMount } from 'svelte';
	import { RefreshCw, Search, SlidersHorizontal } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import InventoryAdjustDialog from '#lib/frontend/components/admin/catalog/InventoryAdjustDialog.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Switch } from '#lib/frontend/components/ui/switch/index.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { formatDateTime } from '#lib/frontend/modules/commerce/format.ts';

	type InventoryRow = {
		id: string;
		sku: string;
		name: string;
		stock: number;
		status: string;
		price: number;
		productId: string;
		productName: string;
		productSku: string;
	};

	type MovementRow = {
		id: string;
		variantId: string;
		delta: number;
		reason: string;
		referenceType: string | null;
		referenceId: string | null;
		createdAt: string;
		variantName: string;
		variantSku: string;
		productName: string;
	};

	const inventoryColumns = $derived([
		{ key: 'productName', label: m.admin_catalog_inventory_col_product() },
		{ key: 'variant', label: m.admin_catalog_inventory_col_variant() },
		{ key: 'stock', label: m.admin_catalog_inventory_col_stock(), class: 'text-right' },
		{ key: 'status', label: m.common_status() },
		{ key: 'actions', label: '', class: 'text-right' }
	]);

	const movementColumns = $derived([
		{ key: 'createdAt', label: m.admin_catalog_inventory_col_when() },
		{ key: 'productName', label: m.admin_catalog_inventory_col_product() },
		{ key: 'variant', label: m.admin_catalog_inventory_col_variant() },
		{ key: 'delta', label: m.admin_catalog_inventory_col_change(), class: 'text-right' },
		{ key: 'reason', label: m.admin_catalog_inventory_col_reason() },
		{ key: 'reference', label: m.admin_catalog_inventory_col_reference() }
	]);

	let inventory = $state<InventoryRow[]>([]);
	let loading = $state(true);
	let error = $state('');
	let page = $state(1);
	let pageSize = $state(25);
	let total = $state(0);
	let search = $state('');
	let lowStock = $state(false);

	let movements = $state<MovementRow[]>([]);
	let movementLoading = $state(true);
	let movementError = $state('');
	let movementPage = $state(1);
	let movementPageSize = $state(10);
	let movementTotal = $state(0);

	let adjustOpen = $state(false);
	let adjusting = $state<{ id: string; name: string; sku: string; stock: number } | null>(null);

	onMount(() => {
		void loadInventory();
		void loadMovements();
	});

	async function loadInventory() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: String(pageSize)
			});
			const term = search.trim();

			if (term) params.set('q', term);
			if (lowStock) params.set('lowStock', 'true');

			const response = await fetch(`/api/admin/inventory?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok)
				throw new Error(errorMessage(payload, 'admin_catalog_inventory_load_failed'));

			inventory = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = errorMessage(err, 'admin_catalog_inventory_load_failed');
		} finally {
			loading = false;
		}
	}

	async function loadMovements() {
		movementLoading = true;
		movementError = '';

		try {
			const params = new URLSearchParams({
				page: String(movementPage),
				pageSize: String(movementPageSize)
			});
			const response = await fetch(`/api/admin/inventory/movements?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok)
				throw new Error(errorMessage(payload, 'admin_catalog_inventory_movements_load_failed'));

			movements = payload.data ?? [];
			movementTotal = Number(payload.total ?? 0);
		} catch (err) {
			movementError = errorMessage(err, 'admin_catalog_inventory_movements_load_failed');
		} finally {
			movementLoading = false;
		}
	}

	function handleSearch(event: SubmitEvent) {
		event.preventDefault();
		page = 1;
		void loadInventory();
	}

	function handleLowStock(checked: boolean) {
		lowStock = checked;
		page = 1;
		void loadInventory();
	}

	function changePage(next: number) {
		page = next;
		void loadInventory();
	}

	function changeMovementPage(next: number) {
		movementPage = next;
		void loadMovements();
	}

	function openAdjust(row: Record<string, unknown>) {
		adjusting = {
			id: String(row.id),
			name: String(row.name ?? ''),
			sku: String(row.sku ?? ''),
			stock: Number(row.stock ?? 0)
		};
		adjustOpen = true;
	}

	async function handleAdjusted() {
		await Promise.all([loadInventory(), loadMovements()]);
	}

	function refresh() {
		void loadInventory();
		void loadMovements();
	}

	function formatDate(value: string) {
		return formatDateTime(value) || m.common_dash();
	}

	function reasonLabel(value: string) {
		switch (value) {
			case 'order':
				return m.admin_catalog_inventory_reason_order();
			case 'order_cancelled':
				return m.admin_catalog_inventory_reason_order_cancelled();
			default:
				return value;
		}
	}

	function formatReference(type: unknown, id: unknown) {
		if (!type) return '—';

		const label =
			String(type) === 'order' ? m.admin_catalog_inventory_reference_order() : String(type);

		return id ? `${label} · ${String(id)}` : label;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.admin_catalog_inventory_title()}</h1>
			<p class="text-sm text-muted-foreground">{m.admin_catalog_inventory_subtitle()}</p>
		</div>
		<Button variant="outline" onclick={refresh} disabled={loading && movementLoading}>
			<RefreshCw class="size-4" />
			{m.common_refresh()}
		</Button>
	</div>

	{#if error}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
		>
			{error}
		</div>
	{/if}

	<form class="flex flex-wrap items-center gap-3" onsubmit={handleSearch}>
		<div class="relative min-w-56 flex-1">
			<Search class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				bind:value={search}
				placeholder={m.admin_catalog_inventory_search_placeholder()}
				class="pl-8"
				aria-label={m.admin_catalog_inventory_search_aria()}
			/>
		</div>
		<Button type="submit" variant="outline">
			<Search class="size-4" />
			{m.common_search()}
		</Button>
		<label for="low-stock" class="flex items-center gap-2 text-sm font-medium">
			<Switch id="low-stock" bind:checked={lowStock} onCheckedChange={handleLowStock} />
			<SlidersHorizontal class="size-4 text-muted-foreground" />
			{m.admin_catalog_inventory_low_stock_only()}
		</label>
	</form>

	<DataTable
		columns={inventoryColumns}
		rows={inventory as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage={m.admin_catalog_inventory_empty()}
		{page}
		{pageSize}
		{total}
		onPageChange={changePage}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'productName'}
				<div class="min-w-40">
					<p class="font-medium">{String(row.productName ?? '')}</p>
					<p class="text-xs text-muted-foreground">{String(row.productSku ?? '')}</p>
				</div>
			{:else if column.key === 'variant'}
				<div class="min-w-40">
					<p>{String(row.name ?? '')}</p>
					<p class="text-xs text-muted-foreground">{String(row.sku ?? '')}</p>
				</div>
			{:else if column.key === 'stock'}
				<span class={Number(row.stock) <= 5 ? 'font-semibold text-destructive' : 'font-medium'}>
					{Number(row.stock ?? 0)}
				</span>
			{:else if column.key === 'status'}
				<StatusBadge status={String(row.status ?? '')} />
			{:else if column.key === 'actions'}
				<div class="flex items-center justify-end">
					<Button variant="outline" size="sm" onclick={() => openAdjust(row)}>
						{m.admin_catalog_inventory_adjust()}
					</Button>
				</div>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>

	<div class="space-y-3">
		<div>
			<h2 class="text-lg font-semibold tracking-tight">
				{m.admin_catalog_inventory_movements_title()}
			</h2>
			<p class="text-sm text-muted-foreground">{m.admin_catalog_inventory_movements_subtitle()}</p>
		</div>

		{#if movementError}
			<div
				class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
			>
				{movementError}
			</div>
		{/if}

		<DataTable
			columns={movementColumns}
			rows={movements as unknown as Record<string, unknown>[]}
			loading={movementLoading}
			emptyMessage={m.admin_catalog_inventory_movements_empty()}
			page={movementPage}
			pageSize={movementPageSize}
			total={movementTotal}
			onPageChange={changeMovementPage}
		>
			{#snippet cell(row, column)}
				{#if column.key === 'createdAt'}
					<span class="text-muted-foreground">{formatDate(String(row.createdAt ?? ''))}</span>
				{:else if column.key === 'productName'}
					{String(row.productName ?? '')}
				{:else if column.key === 'variant'}
					<div class="min-w-40">
						<p>{String(row.variantName ?? '')}</p>
						<p class="text-xs text-muted-foreground">{String(row.variantSku ?? '')}</p>
					</div>
				{:else if column.key === 'delta'}
					<span
						class={Number(row.delta) >= 0
							? 'font-semibold text-emerald-600'
							: 'font-semibold text-destructive'}
					>
						{Number(row.delta) > 0 ? '+' : ''}{Number(row.delta)}
					</span>
				{:else if column.key === 'reason'}
					{reasonLabel(String(row.reason ?? '')) || '—'}
				{:else if column.key === 'reference'}
					{formatReference(row.referenceType, row.referenceId)}
				{:else}
					{String(row[column.key] ?? '—')}
				{/if}
			{/snippet}
		</DataTable>
	</div>
</div>

{#if adjustOpen}
	<InventoryAdjustDialog bind:open={adjustOpen} variant={adjusting} onsaved={handleAdjusted} />
{/if}

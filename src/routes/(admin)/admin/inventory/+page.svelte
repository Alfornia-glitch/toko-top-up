<script lang="ts">
	import { onMount } from 'svelte';
	import { RefreshCw, Search, SlidersHorizontal } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import InventoryAdjustDialog from '#lib/frontend/components/admin/catalog/InventoryAdjustDialog.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Switch } from '#lib/frontend/components/ui/switch/index.ts';

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

	const inventoryColumns = [
		{ key: 'productName', label: 'Product' },
		{ key: 'variant', label: 'Variant' },
		{ key: 'stock', label: 'Stock', class: 'text-right' },
		{ key: 'status', label: 'Status' },
		{ key: 'actions', label: '', class: 'text-right' }
	];

	const movementColumns = [
		{ key: 'createdAt', label: 'When' },
		{ key: 'productName', label: 'Product' },
		{ key: 'variant', label: 'Variant' },
		{ key: 'delta', label: 'Change', class: 'text-right' },
		{ key: 'reason', label: 'Reason' },
		{ key: 'reference', label: 'Reference' }
	];

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

			if (!response.ok) throw new Error(payload.error ?? 'Could not load inventory');

			inventory = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load inventory';
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

			if (!response.ok) throw new Error(payload.error ?? 'Could not load stock movements');

			movements = payload.data ?? [];
			movementTotal = Number(payload.total ?? 0);
		} catch (err) {
			movementError = err instanceof Error ? err.message : 'Could not load stock movements';
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

	function formatReference(type: unknown, id: unknown) {
		if (!type) return '—';

		return id ? `${String(type)} · ${String(id)}` : String(type);
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Inventory</h1>
			<p class="text-sm text-muted-foreground">Track stock levels and adjust variants.</p>
		</div>
		<Button variant="outline" onclick={refresh} disabled={loading && movementLoading}>
			<RefreshCw class="size-4" />
			Refresh
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
				placeholder="Search by product, variant or SKU"
				class="pl-8"
				aria-label="Search inventory"
			/>
		</div>
		<Button type="submit" variant="outline">
			<Search class="size-4" />
			Search
		</Button>
		<label for="low-stock" class="flex items-center gap-2 text-sm font-medium">
			<Switch id="low-stock" bind:checked={lowStock} onCheckedChange={handleLowStock} />
			<SlidersHorizontal class="size-4 text-muted-foreground" />
			Low stock only
		</label>
	</form>

	<DataTable
		columns={inventoryColumns}
		rows={inventory as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No variants match the current filters."
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
					<Button variant="outline" size="sm" onclick={() => openAdjust(row)}>Adjust</Button>
				</div>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>

	<div class="space-y-3">
		<div>
			<h2 class="text-lg font-semibold tracking-tight">Recent stock movements</h2>
			<p class="text-sm text-muted-foreground">The latest inventory changes across all variants.</p>
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
			emptyMessage="No stock movements yet."
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
					{String(row.reason ?? '—')}
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

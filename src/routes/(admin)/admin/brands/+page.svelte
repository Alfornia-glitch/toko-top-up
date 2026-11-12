<script lang="ts">
	import { onMount } from 'svelte';
	import { Pencil, Plus, Trash2 } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import ConfirmDialog from '#lib/frontend/components/admin/ConfirmDialog.svelte';
	import BrandDialog from '#lib/frontend/components/admin/catalog/BrandDialog.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';

	type BrandRow = {
		id: string;
		name: string;
		slug: string;
		logoUrl: string | null;
		description: string | null;
		status: string;
		updatedAt: string;
		productCount: number;
	};

	const columns = [
		{ key: 'logoUrl', label: 'Logo' },
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'slug', label: 'Slug', sortable: true },
		{ key: 'productCount', label: 'Products', sortable: true, class: 'text-right' },
		{ key: 'status', label: 'Status' },
		{ key: 'updatedAt', label: 'Updated', sortable: true },
		{ key: 'actions', label: '', class: 'text-right' }
	];

	let brands = $state<BrandRow[]>([]);
	let loading = $state(true);
	let error = $state('');
	let sortKey = $state('name');
	let sortDir = $state<'asc' | 'desc'>('asc');

	let dialogOpen = $state(false);
	let editing = $state<BrandRow | null>(null);
	let deleteOpen = $state(false);
	let deleting = $state<BrandRow | null>(null);

	const sortedBrands = $derived.by(() => {
		const rows = [...brands];
		const direction = sortDir === 'asc' ? 1 : -1;

		rows.sort((a, b) => {
			let result = 0;

			if (sortKey === 'productCount') result = a.productCount - b.productCount;
			else if (sortKey === 'updatedAt')
				result = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
			else if (sortKey === 'slug') result = a.slug.localeCompare(b.slug);
			else result = a.name.localeCompare(b.name);

			return result * direction;
		});

		return rows;
	});

	onMount(() => {
		void loadBrands();
	});

	async function loadBrands() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/admin/brands');
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load brands');

			brands = payload.data ?? [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load brands';
		} finally {
			loading = false;
		}
	}

	function handleSort(key: string) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
			return;
		}

		sortKey = key;
		sortDir = 'asc';
	}

	function openCreate() {
		editing = null;
		dialogOpen = true;
	}

	function openEdit(row: Record<string, unknown>) {
		const item = brands.find((brand) => brand.id === String(row.id));
		if (!item) return;

		editing = item;
		dialogOpen = true;
	}

	function openDelete(row: Record<string, unknown>) {
		const item = brands.find((brand) => brand.id === String(row.id));
		if (!item) return;

		deleting = item;
		deleteOpen = true;
	}

	async function deleteBrand() {
		if (!deleting) return;

		try {
			const response = await fetch(`/api/admin/brands/${deleting.id}`, { method: 'DELETE' });
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not delete brand');

			await loadBrands();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not delete brand';
		} finally {
			deleting = null;
		}
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
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Brands</h1>
			<p class="text-sm text-muted-foreground">Manage the brands shown across the catalog.</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="size-4" />
			New brand
		</Button>
	</div>

	{#if error}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
		>
			{error}
		</div>
	{/if}

	<DataTable
		{columns}
		rows={sortedBrands as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No brands yet."
		page={1}
		pageSize={Math.max(1, sortedBrands.length)}
		total={sortedBrands.length}
		{sortKey}
		{sortDir}
		onSort={handleSort}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'logoUrl'}
				{#if row.logoUrl}
					<img
						src={String(row.logoUrl)}
						alt={`${String(row.name ?? 'Brand')} logo`}
						class="size-9 rounded-md border bg-muted object-contain p-0.5"
						loading="lazy"
					/>
				{:else}
					<div
						class="flex size-9 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground"
					>
						—
					</div>
				{/if}
			{:else if column.key === 'name'}
				<span class="font-medium">{String(row.name ?? '')}</span>
			{:else if column.key === 'slug'}
				<code class="text-xs text-muted-foreground">{String(row.slug ?? '')}</code>
			{:else if column.key === 'productCount'}
				{Number(row.productCount ?? 0)}
			{:else if column.key === 'status'}
				<StatusBadge status={String(row.status ?? '')} />
			{:else if column.key === 'updatedAt'}
				<span class="text-muted-foreground">{formatDate(String(row.updatedAt ?? ''))}</span>
			{:else if column.key === 'actions'}
				<div class="flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Edit brand"
						onclick={() => openEdit(row)}
					>
						<Pencil class="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						class="text-destructive hover:bg-destructive/10"
						aria-label="Delete brand"
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
	<BrandDialog bind:open={dialogOpen} brand={editing} onsaved={loadBrands} />
{/if}

<ConfirmDialog
	bind:open={deleteOpen}
	title="Delete brand"
	description={`Delete “${deleting?.name ?? 'this brand'}”? Brands with products cannot be deleted.`}
	confirmLabel="Delete"
	destructive
	onConfirm={deleteBrand}
/>

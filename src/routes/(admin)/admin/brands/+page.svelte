<script lang="ts">
	import { onMount } from 'svelte';
	import { Pencil, Plus, Trash2 } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import ConfirmDialog from '#lib/frontend/components/admin/ConfirmDialog.svelte';
	import BrandDialog from '#lib/frontend/components/admin/catalog/BrandDialog.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { formatDateTime } from '#lib/frontend/modules/commerce/format.ts';

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

	const columns = $derived([
		{ key: 'logoUrl', label: m.admin_catalog_brands_col_logo() },
		{ key: 'name', label: m.common_name(), sortable: true },
		{ key: 'slug', label: m.admin_catalog_brands_col_slug(), sortable: true },
		{
			key: 'productCount',
			label: m.admin_catalog_brands_col_products(),
			sortable: true,
			class: 'text-right'
		},
		{ key: 'status', label: m.common_status() },
		{ key: 'updatedAt', label: m.admin_catalog_brands_col_updated(), sortable: true },
		{ key: 'actions', label: '', class: 'text-right' }
	]);

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

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_catalog_brands_load_failed'));

			brands = payload.data ?? [];
		} catch (err) {
			error = errorMessage(err, 'admin_catalog_brands_load_failed');
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

			if (!response.ok)
				throw new Error(errorMessage(payload, 'admin_catalog_brands_delete_failed'));

			await loadBrands();
		} catch (err) {
			error = errorMessage(err, 'admin_catalog_brands_delete_failed');
		} finally {
			deleting = null;
		}
	}

	function formatDate(value: string) {
		return formatDateTime(value) || m.common_dash();
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.admin_catalog_brands_title()}</h1>
			<p class="text-sm text-muted-foreground">{m.admin_catalog_brands_subtitle()}</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="size-4" />
			{m.admin_catalog_brands_new()}
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
		emptyMessage={m.admin_catalog_brands_empty()}
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
						alt={m.admin_catalog_brands_logo_alt({ name: String(row.name ?? m.common_brand()) })}
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
						aria-label={m.admin_catalog_brands_edit_aria()}
						onclick={() => openEdit(row)}
					>
						<Pencil class="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						class="text-destructive hover:bg-destructive/10"
						aria-label={m.admin_catalog_brands_delete_aria()}
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
	title={m.admin_catalog_brands_delete_title()}
	description={m.admin_catalog_brands_delete_description({
		name: deleting?.name ?? m.admin_catalog_brands_delete_this()
	})}
	confirmLabel={m.common_delete()}
	cancelLabel={m.common_cancel()}
	destructive
	onConfirm={deleteBrand}
/>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Image as ImageIcon, Pencil, Plus, Trash2 } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import ConfirmDialog from '#lib/frontend/components/admin/ConfirmDialog.svelte';
	import CategoryDialog from '#lib/frontend/components/admin/catalog/CategoryDialog.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';

	type CategoryRow = {
		id: string;
		name: string;
		slug: string;
		parentId: string | null;
		parentName: string | null;
		description: string | null;
		imageUrl: string | null;
		position: number;
		status: string;
		updatedAt: string;
		productCount: number;
	};

	const columns = [
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'slug', label: 'Slug', sortable: true },
		{ key: 'parentName', label: 'Parent' },
		{ key: 'productCount', label: 'Products', sortable: true, class: 'text-right' },
		{ key: 'position', label: 'Position', sortable: true, class: 'text-right' },
		{ key: 'status', label: 'Status' },
		{ key: 'updatedAt', label: 'Updated', sortable: true },
		{ key: 'actions', label: '', class: 'text-right' }
	];

	let categories = $state<CategoryRow[]>([]);
	let loading = $state(true);
	let error = $state('');
	let sortKey = $state('position');
	let sortDir = $state<'asc' | 'desc'>('asc');

	let dialogOpen = $state(false);
	let editing = $state<CategoryRow | null>(null);
	let deleteOpen = $state(false);
	let deleting = $state<CategoryRow | null>(null);

	const sortedCategories = $derived.by(() => {
		const rows = [...categories];
		const direction = sortDir === 'asc' ? 1 : -1;

		rows.sort((a, b) => {
			let result = 0;

			if (sortKey === 'position') result = a.position - b.position;
			else if (sortKey === 'productCount') result = a.productCount - b.productCount;
			else if (sortKey === 'updatedAt')
				result = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
			else if (sortKey === 'slug') result = a.slug.localeCompare(b.slug);
			else result = a.name.localeCompare(b.name);

			return result * direction;
		});

		return rows;
	});

	const dialogCategories = $derived(
		categories.map((category) => ({
			id: category.id,
			name: category.name,
			parentId: category.parentId
		}))
	);

	onMount(() => {
		void loadCategories();
	});

	async function loadCategories() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/admin/categories');
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load categories');

			categories = payload.data ?? [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load categories';
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
		const item = categories.find((category) => category.id === String(row.id));
		if (!item) return;

		editing = item;
		dialogOpen = true;
	}

	function openDelete(row: Record<string, unknown>) {
		const item = categories.find((category) => category.id === String(row.id));
		if (!item) return;

		deleting = item;
		deleteOpen = true;
	}

	async function deleteCategory() {
		if (!deleting) return;

		try {
			const response = await fetch(`/api/admin/categories/${deleting.id}`, { method: 'DELETE' });
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not delete category');

			await loadCategories();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not delete category';
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
			<h1 class="text-2xl font-semibold tracking-tight">Categories</h1>
			<p class="text-sm text-muted-foreground">Organise products into a browsable hierarchy.</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="size-4" />
			New category
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
		rows={sortedCategories as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No categories yet."
		page={1}
		pageSize={Math.max(1, sortedCategories.length)}
		total={sortedCategories.length}
		{sortKey}
		{sortDir}
		onSort={handleSort}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'name'}
				<div class="flex items-center gap-3">
					{#if row.imageUrl}
						<img
							src={String(row.imageUrl)}
							alt=""
							class="size-9 shrink-0 rounded-full border bg-muted object-cover"
							loading="lazy"
						/>
					{:else}
						<div
							class="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground"
						>
							<ImageIcon class="size-4" />
						</div>
					{/if}
					<span class="font-medium">{String(row.name ?? '')}</span>
				</div>
			{:else if column.key === 'slug'}
				<code class="text-xs text-muted-foreground">{String(row.slug ?? '')}</code>
			{:else if column.key === 'parentName'}
				{row.parentName ? String(row.parentName) : '—'}
			{:else if column.key === 'productCount'}
				{Number(row.productCount ?? 0)}
			{:else if column.key === 'position'}
				{Number(row.position ?? 0)}
			{:else if column.key === 'status'}
				<StatusBadge status={String(row.status ?? '')} />
			{:else if column.key === 'updatedAt'}
				<span class="text-muted-foreground">{formatDate(String(row.updatedAt ?? ''))}</span>
			{:else if column.key === 'actions'}
				<div class="flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Edit category"
						onclick={() => openEdit(row)}
					>
						<Pencil class="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						class="text-destructive hover:bg-destructive/10"
						aria-label="Delete category"
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
	<CategoryDialog
		bind:open={dialogOpen}
		category={editing}
		categories={dialogCategories}
		onsaved={loadCategories}
	/>
{/if}

<ConfirmDialog
	bind:open={deleteOpen}
	title="Delete category"
	description={`Delete “${deleting?.name ?? 'this category'}”? Categories with products or child categories cannot be deleted.`}
	confirmLabel="Delete"
	destructive
	onConfirm={deleteCategory}
/>

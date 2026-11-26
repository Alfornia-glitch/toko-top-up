<script lang="ts">
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { onDestroy, onMount } from 'svelte';
	import { Archive, Package, Pencil, Plus } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import ConfirmDialog from '#lib/frontend/components/admin/ConfirmDialog.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';

	type ProductRow = {
		id: string;
		sku: string;
		name: string;
		slug: string;
		status: string;
		price: number;
		compareAtPrice: number | null;
		currency: string;
		isFeatured: boolean;
		updatedAt: string;
		brandName: string | null;
		categoryName: string | null;
		imageUrl: string | null;
		stock: number;
	};

	type FilterOption = {
		id: string;
		name: string;
		parentName?: string | null;
	};

	const columns = [
		{ key: 'name', label: 'Product', sortable: true },
		{ key: 'sku', label: 'SKU', sortable: true },
		{ key: 'status', label: 'Status' },
		{ key: 'price', label: 'Price', sortable: true, class: 'text-right' },
		{ key: 'stock', label: 'Stock', class: 'text-right' },
		{ key: 'updatedAt', label: 'Updated', sortable: true },
		{ key: 'actions', label: '', class: 'text-right' }
	];

	const pageSize = 25;

	let products = $state<ProductRow[]>([]);
	let categories = $state<FilterOption[]>([]);
	let brands = $state<FilterOption[]>([]);
	let loading = $state(true);
	let error = $state('');
	let filterError = $state('');

	let q = $state('');
	let statusFilter = $state('all');
	let categoryFilter = $state('all');
	let brandFilter = $state('all');
	let page = $state(1);
	let total = $state(0);
	let sortKey = $state('updatedAt');
	let sortDir = $state<'asc' | 'desc'>('desc');

	let archiveOpen = $state(false);
	let archiveTarget = $state<ProductRow | null>(null);

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		void loadCategories();
		void loadBrands();
		void loadProducts();
	});

	onDestroy(() => {
		if (searchTimer) clearTimeout(searchTimer);
	});

	async function loadProducts() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams();
			params.set('page', String(page));
			params.set('pageSize', String(pageSize));
			params.set('sort', `${sortDir === 'desc' ? '-' : ''}${sortKey}`);

			if (q.trim()) params.set('q', q.trim());
			if (statusFilter !== 'all') params.set('status', statusFilter);
			if (categoryFilter !== 'all') params.set('categoryId', categoryFilter);
			if (brandFilter !== 'all') params.set('brandId', brandFilter);

			const response = await fetch(`/api/admin/products?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load products');

			products = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load products';
		} finally {
			loading = false;
		}
	}

	async function loadCategories() {
		try {
			const response = await fetch('/api/admin/categories');
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load categories');

			categories = payload.data ?? [];
		} catch (err) {
			filterError = err instanceof Error ? err.message : 'Could not load categories';
		}
	}

	async function loadBrands() {
		try {
			const response = await fetch('/api/admin/brands');
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load brands');

			brands = payload.data ?? [];
		} catch (err) {
			filterError = err instanceof Error ? err.message : 'Could not load brands';
		}
	}

	function handleSearch() {
		if (searchTimer) clearTimeout(searchTimer);

		searchTimer = setTimeout(() => {
			page = 1;
			void loadProducts();
		}, 300);
	}

	function handleStatusChange(value: string) {
		statusFilter = value;
		page = 1;
		void loadProducts();
	}

	function handleCategoryChange(value: string) {
		categoryFilter = value;
		page = 1;
		void loadProducts();
	}

	function handleBrandChange(value: string) {
		brandFilter = value;
		page = 1;
		void loadProducts();
	}

	function handleSort(key: string) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}

		page = 1;
		void loadProducts();
	}

	function handlePageChange(nextPage: number) {
		page = nextPage;
		void loadProducts();
	}

	function openArchive(row: Record<string, unknown>) {
		const item = products.find((product) => product.id === String(row.id));
		if (!item) return;

		archiveTarget = item;
		archiveOpen = true;
	}

	async function archiveProduct() {
		if (!archiveTarget) return;

		error = '';

		try {
			const response = await fetch(`/api/admin/products/${archiveTarget.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ status: 'archived' })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not archive product');

			await loadProducts();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not archive product';
		} finally {
			archiveTarget = null;
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
			<h1 class="text-2xl font-semibold tracking-tight">Products</h1>
			<p class="text-sm text-muted-foreground">Manage the catalog, pricing and stock.</p>
		</div>
		<Button href="/admin/products/new">
			<Plus class="size-4" />
			New product
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

	{#if filterError}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
			role="alert"
		>
			{filterError}
		</div>
	{/if}

	<Card.Root>
		<Card.Content class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<div class="space-y-1.5">
				<Label for="product-search">Search</Label>
				<Input
					id="product-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder="Search name, SKU or slug"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="product-status-filter">Status</Label>
				<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
					<Select.Trigger id="product-status-filter" class="w-full">
						<Select.Value placeholder="All statuses" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label="All statuses">All statuses</Select.Item>
						<Select.Item value="draft" label="Draft">Draft</Select.Item>
						<Select.Item value="active" label="Active">Active</Select.Item>
						<Select.Item value="archived" label="Archived">Archived</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-1.5">
				<Label for="product-category-filter">Category</Label>
				<Select.Root type="single" value={categoryFilter} onValueChange={handleCategoryChange}>
					<Select.Trigger id="product-category-filter" class="w-full">
						<Select.Value placeholder="All categories" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label="All categories">All categories</Select.Item>
						{#each categories as category (category.id)}
							<Select.Item value={category.id} label={category.name}>
								{category.parentName ? `${category.parentName} / ${category.name}` : category.name}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-1.5">
				<Label for="product-brand-filter">Brand</Label>
				<Select.Root type="single" value={brandFilter} onValueChange={handleBrandChange}>
					<Select.Trigger id="product-brand-filter" class="w-full">
						<Select.Value placeholder="All brands" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label="All brands">All brands</Select.Item>
						{#each brands as brand (brand.id)}
							<Select.Item value={brand.id} label={brand.name}>{brand.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={products as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No products match the current filters."
		{page}
		{pageSize}
		{total}
		{sortKey}
		{sortDir}
		onSort={handleSort}
		onPageChange={handlePageChange}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'name'}
				<div class="flex items-center gap-3">
					{#if row.imageUrl}
						<img
							src={String(row.imageUrl)}
							alt={`${String(row.name ?? 'Product')} thumbnail`}
							class="size-10 rounded-md border bg-muted object-cover"
							loading="lazy"
						/>
					{:else}
						<div
							class="flex size-10 items-center justify-center rounded-md border bg-muted text-muted-foreground"
						>
							<Package class="size-4" />
						</div>
					{/if}
					<a href={`/admin/products/${String(row.id)}`} class="min-w-0 font-medium hover:underline">
						<span class="block truncate">{String(row.name ?? '')}</span>
					</a>
				</div>
			{:else if column.key === 'sku'}
				<code class="text-xs text-muted-foreground">{String(row.sku ?? '')}</code>
			{:else if column.key === 'status'}
				<StatusBadge status={String(row.status ?? '')} />
			{:else if column.key === 'price'}
				<span class="font-medium">
					{formatMoney(Number(row.price ?? 0), String(row.currency ?? 'IDR'))}
				</span>
			{:else if column.key === 'stock'}
				{Number(row.stock ?? 0)}
			{:else if column.key === 'updatedAt'}
				<span class="text-muted-foreground">{formatDate(String(row.updatedAt ?? ''))}</span>
			{:else if column.key === 'actions'}
				<div class="flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Edit product"
						href={`/admin/products/${String(row.id)}`}
					>
						<Pencil class="size-4" />
					</Button>
					{#if row.status !== 'archived'}
						<Button
							variant="ghost"
							size="icon-sm"
							class="text-destructive hover:bg-destructive/10"
							aria-label="Archive product"
							onclick={() => openArchive(row)}
						>
							<Archive class="size-4" />
						</Button>
					{/if}
				</div>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

<ConfirmDialog
	bind:open={archiveOpen}
	title="Archive product"
	description={`Archive “${archiveTarget?.name ?? 'this product'}”? It will be hidden from the storefront.`}
	confirmLabel="Archive"
	destructive
	onConfirm={archiveProduct}
/>

<script lang="ts">
	import { formatDate, formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { onMount } from 'svelte';
	import { RefreshCw, Search } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import * as Avatar from '#lib/frontend/components/ui/avatar/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';

	type CustomerRow = {
		id: string;
		name: string;
		email: string;
		image: string | null;
		createdAt: string;
		orderCount: number;
		spent: number;
	};

	const columns = $derived([
		{ key: 'name', label: m.common_customer(), sortable: true },
		{ key: 'email', label: m.common_email(), sortable: true },
		{ key: 'orderCount', label: m.common_orders(), class: 'text-right' },
		{ key: 'spent', label: m.admin_ops_customers_col_spent(), class: 'text-right' },
		{ key: 'createdAt', label: m.admin_ops_customers_col_joined(), sortable: true },
		{ key: 'actions', label: '', class: 'text-right' }
	]);

	const pageSize = 25;

	let customers = $state<CustomerRow[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let page = $state(1);
	let total = $state(0);
	let sortKey = $state('createdAt');
	let sortDir = $state<'asc' | 'desc'>('desc');

	onMount(() => {
		void loadCustomers();
	});

	async function loadCustomers() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: String(pageSize),
				sort: `${sortDir === 'desc' ? '-' : ''}${sortKey}`
			});
			const term = search.trim();

			if (term) params.set('q', term);

			const response = await fetch(`/api/admin/customers?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_customers_load_failed'));

			customers = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = errorMessage(err, 'admin_ops_customers_load_failed');
		} finally {
			loading = false;
		}
	}

	function handleSearch(event: SubmitEvent) {
		event.preventDefault();
		page = 1;
		void loadCustomers();
	}

	function handleSort(key: string) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}

		page = 1;
		void loadCustomers();
	}

	function handlePageChange(nextPage: number) {
		page = nextPage;
		void loadCustomers();
	}

	function initials(name: string, email: string) {
		const source = name.trim() || email.trim();
		const parts = source.split(/\s+/).filter(Boolean);

		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

		return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.common_customers()}</h1>
			<p class="text-sm text-muted-foreground">{m.admin_ops_customers_subtitle()}</p>
		</div>
		<Button variant="outline" onclick={() => void loadCustomers()} disabled={loading}>
			<RefreshCw class="size-4" />
			{m.common_refresh()}
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
		<Card.Content class="py-4">
			<form class="flex flex-wrap items-end gap-3" onsubmit={handleSearch}>
				<div class="min-w-56 flex-1 space-y-1.5">
					<Label for="customer-search">{m.common_search()}</Label>
					<div class="relative">
						<Search
							class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							id="customer-search"
							bind:value={search}
							placeholder={m.admin_ops_customers_search_placeholder()}
							class="pl-8"
						/>
					</div>
				</div>
				<Button type="submit" variant="outline">
					<Search class="size-4" />
					{m.common_search()}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={customers as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage={m.admin_ops_customers_empty()}
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
				<div class="flex min-w-48 items-center gap-3">
					<Avatar.Root size="sm">
						{#if row.image}
							<Avatar.Image
								src={String(row.image)}
								alt={String(row.name ?? m.admin_ops_customers_avatar_alt())}
							/>
						{/if}
						<Avatar.Fallback>
							{initials(String(row.name ?? ''), String(row.email ?? ''))}
						</Avatar.Fallback>
					</Avatar.Root>
					<a
						href={`/admin/customers/${String(row.id)}`}
						class="min-w-0 font-medium hover:underline"
					>
						<span class="block truncate">{String(row.name ?? '—')}</span>
					</a>
				</div>
			{:else if column.key === 'email'}
				<span class="text-muted-foreground">{String(row.email ?? '—')}</span>
			{:else if column.key === 'orderCount'}
				{Number(row.orderCount ?? 0)}
			{:else if column.key === 'spent'}
				<span class="font-medium">{formatMoney(Number(row.spent ?? 0))}</span>
			{:else if column.key === 'createdAt'}
				<span class="text-muted-foreground">{formatDate(String(row.createdAt ?? '')) || '—'}</span>
			{:else if column.key === 'actions'}
				<div class="flex items-center justify-end">
					<Button variant="outline" size="sm" href={`/admin/customers/${String(row.id)}`}>
						{m.common_view()}
					</Button>
				</div>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

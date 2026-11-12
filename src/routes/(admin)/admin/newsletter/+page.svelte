<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Download, LoaderCircle } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';

	type NewsletterRow = {
		id: string;
		userId: string | null;
		email: string;
		preferencesJson: Record<string, unknown> | null;
		status: string;
		source: string | null;
		createdAt: string;
		updatedAt: string;
	};

	const columns = [
		{ key: 'email', label: 'Email' },
		{ key: 'status', label: 'Status' },
		{ key: 'source', label: 'Source' },
		{ key: 'createdAt', label: 'Subscribed' },
		{ key: 'actions', label: '', class: 'text-right' }
	];

	const pageSize = 25;

	let subscriptions = $state<NewsletterRow[]>([]);
	let loading = $state(true);
	let error = $state('');
	let busyId = $state('');
	let exporting = $state(false);

	let q = $state('');
	let statusFilter = $state('all');
	let page = $state(1);
	let total = $state(0);

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		void loadNewsletter();
	});

	onDestroy(() => {
		if (searchTimer) clearTimeout(searchTimer);
	});

	async function loadNewsletter() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams();
			params.set('page', String(page));
			params.set('pageSize', String(pageSize));
			if (q.trim()) params.set('q', q.trim());
			if (statusFilter !== 'all') params.set('status', statusFilter);

			const response = await fetch(`/api/admin/newsletter?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load subscriptions');

			subscriptions = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load subscriptions';
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		if (searchTimer) clearTimeout(searchTimer);

		searchTimer = setTimeout(() => {
			page = 1;
			void loadNewsletter();
		}, 300);
	}

	function handleStatusChange(value: string) {
		statusFilter = value;
		page = 1;
		void loadNewsletter();
	}

	function handlePageChange(nextPage: number) {
		page = nextPage;
		void loadNewsletter();
	}

	async function toggleStatus(row: Record<string, unknown>) {
		const item = subscriptions.find((subscription) => subscription.id === String(row.id));
		if (!item) return;

		const nextStatus = item.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
		busyId = item.id;
		error = '';

		try {
			const response = await fetch(`/api/admin/newsletter/${item.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ status: nextStatus })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not update subscription');

			await loadNewsletter();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not update subscription';
		} finally {
			busyId = '';
		}
	}

	function csvCell(value: unknown) {
		const text = value === null || value === undefined ? '' : String(value);
		return `"${text.replaceAll('"', '""')}"`;
	}

	async function exportCsv() {
		exporting = true;
		error = '';

		try {
			const params = new URLSearchParams();
			params.set('page', '1');
			params.set('pageSize', '100');
			if (q.trim()) params.set('q', q.trim());
			if (statusFilter !== 'all') params.set('status', statusFilter);

			const response = await fetch(`/api/admin/newsletter?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not export subscriptions');

			const rows = (payload.data ?? []) as NewsletterRow[];
			const lines = [
				['Email', 'Status', 'Source', 'Created at'],
				...rows.map((row) => [row.email, row.status, row.source ?? '', row.createdAt])
			].map((cells) => cells.map(csvCell).join(','));

			const blob = new Blob([`\ufeff${lines.join('\n')}`], {
				type: 'text/csv;charset=utf-8;'
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not export subscriptions';
		} finally {
			exporting = false;
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
			<h1 class="text-2xl font-semibold tracking-tight">Newsletter</h1>
			<p class="text-sm text-muted-foreground">Manage email subscriptions and export the list.</p>
		</div>
		<Button variant="outline" onclick={exportCsv} disabled={exporting}>
			{#if exporting}
				<LoaderCircle class="size-4 animate-spin" />
				Exporting…
			{:else}
				<Download class="size-4" />
				Export CSV
			{/if}
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
				<Label for="newsletter-search">Search</Label>
				<Input
					id="newsletter-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder="Search by email"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="newsletter-status-filter">Status</Label>
				<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
					<Select.Trigger id="newsletter-status-filter" class="w-full">
						<Select.Value placeholder="All statuses" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label="All statuses">All statuses</Select.Item>
						<Select.Item value="subscribed" label="Subscribed">Subscribed</Select.Item>
						<Select.Item value="unsubscribed" label="Unsubscribed">Unsubscribed</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={subscriptions as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No subscriptions match the current filters."
		{page}
		{pageSize}
		{total}
		onPageChange={handlePageChange}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'email'}
				<span class="font-medium">{String(row.email ?? '')}</span>
			{:else if column.key === 'status'}
				<StatusBadge status={String(row.status ?? '')} />
			{:else if column.key === 'source'}
				<span class="text-muted-foreground capitalize">{String(row.source ?? '—')}</span>
			{:else if column.key === 'createdAt'}
				<span class="text-muted-foreground">{formatDate(String(row.createdAt ?? ''))}</span>
			{:else if column.key === 'actions'}
				<div class="flex items-center justify-end">
					<Button
						variant="outline"
						size="sm"
						disabled={busyId === String(row.id)}
						onclick={() => toggleStatus(row)}
					>
						{row.status === 'subscribed' ? 'Unsubscribe' : 'Subscribe'}
					</Button>
				</div>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

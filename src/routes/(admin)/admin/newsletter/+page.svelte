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
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { statusLabel } from '#lib/frontend/i18n/labels.ts';
	import { formatDateTime } from '#lib/frontend/modules/commerce/format.ts';

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

	const columns = $derived([
		{ key: 'email', label: m.common_email() },
		{ key: 'status', label: m.common_status() },
		{ key: 'source', label: m.admin_catalog_newsletter_col_source() },
		{ key: 'createdAt', label: m.admin_catalog_newsletter_col_subscribed() },
		{ key: 'actions', label: '', class: 'text-right' }
	]);

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

			if (!response.ok)
				throw new Error(errorMessage(payload, 'admin_catalog_newsletter_load_failed'));

			subscriptions = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = errorMessage(err, 'admin_catalog_newsletter_load_failed');
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

			if (!response.ok)
				throw new Error(errorMessage(payload, 'admin_catalog_newsletter_update_failed'));

			await loadNewsletter();
		} catch (err) {
			error = errorMessage(err, 'admin_catalog_newsletter_update_failed');
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

			if (!response.ok)
				throw new Error(errorMessage(payload, 'admin_catalog_newsletter_export_failed'));

			const rows = (payload.data ?? []) as NewsletterRow[];
			const lines = [
				[
					m.common_email(),
					m.common_status(),
					m.admin_catalog_newsletter_col_source(),
					m.admin_catalog_newsletter_csv_created_at()
				],
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
			error = errorMessage(err, 'admin_catalog_newsletter_export_failed');
		} finally {
			exporting = false;
		}
	}

	function formatDate(value: string) {
		return formatDateTime(value) || m.common_dash();
	}

	function sourceLabel(value: unknown) {
		if (!value) return '—';
		return value === 'footer' ? m.admin_catalog_newsletter_source_footer() : String(value);
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.admin_catalog_newsletter_title()}</h1>
			<p class="text-sm text-muted-foreground">{m.admin_catalog_newsletter_subtitle()}</p>
		</div>
		<Button variant="outline" onclick={exportCsv} disabled={exporting}>
			{#if exporting}
				<LoaderCircle class="size-4 animate-spin" />
				{m.admin_catalog_newsletter_exporting()}
			{:else}
				<Download class="size-4" />
				{m.admin_catalog_newsletter_export_csv()}
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
				<Label for="newsletter-search">{m.common_search()}</Label>
				<Input
					id="newsletter-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder={m.admin_catalog_newsletter_search_placeholder()}
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="newsletter-status-filter">{m.common_status()}</Label>
				<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
					<Select.Trigger id="newsletter-status-filter" class="w-full">
						<Select.Value placeholder={m.common_all_statuses()} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label={m.common_all_statuses()}>
							{m.common_all_statuses()}
						</Select.Item>
						{#each ['subscribed', 'unsubscribed'] as value (value)}
							<Select.Item {value} label={statusLabel('newsletter', value)}>
								{statusLabel('newsletter', value)}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={subscriptions as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage={m.admin_catalog_newsletter_empty()}
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
				<span class="text-muted-foreground">{sourceLabel(row.source)}</span>
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
						{row.status === 'subscribed'
							? m.admin_catalog_newsletter_unsubscribe()
							: m.admin_catalog_newsletter_subscribe()}
					</Button>
				</div>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

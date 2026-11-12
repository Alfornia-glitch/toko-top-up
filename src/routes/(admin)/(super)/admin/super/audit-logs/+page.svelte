<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Eye, LoaderCircle } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import * as Sheet from '#lib/frontend/components/ui/sheet/index.ts';

	type AuditLog = {
		id: string;
		actorUserId: string | null;
		action: string;
		entityType: string;
		entityId: string | null;
		beforeJson: unknown;
		afterJson: unknown;
		ipAddress: string | null;
		userAgent: string | null;
		createdAt: string;
	};

	const columns = [
		{ key: 'createdAt', label: 'Time' },
		{ key: 'actor', label: 'Actor' },
		{ key: 'action', label: 'Action' },
		{ key: 'entity', label: 'Entity' },
		{ key: 'actions', label: '', class: 'text-right' }
	];

	const entityTypes = [
		'user',
		'session',
		'coupon',
		'gift_card',
		'newsletter',
		'review',
		'site_settings',
		'support_ticket',
		'system',
		'product',
		'order',
		'category',
		'brand',
		'return',
		'media',
		'content',
		'inventory'
	];

	const pageSize = 25;

	let logs = $state<AuditLog[]>([]);
	let loading = $state(true);
	let error = $state('');
	let q = $state('');
	let entityFilter = $state('all');
	let page = $state(1);
	let total = $state(0);

	let detailOpen = $state(false);
	let selected = $state<AuditLog | null>(null);

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		void loadLogs();
	});

	onDestroy(() => {
		if (searchTimer) clearTimeout(searchTimer);
	});

	async function loadLogs() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams();
			params.set('page', String(page));
			params.set('pageSize', String(pageSize));
			if (q.trim()) params.set('q', q.trim());
			if (entityFilter !== 'all') params.set('status', entityFilter);

			const response = await fetch(`/api/admin/super/audit-logs?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load audit logs');

			logs = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load audit logs';
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		if (searchTimer) clearTimeout(searchTimer);

		searchTimer = setTimeout(() => {
			page = 1;
			void loadLogs();
		}, 300);
	}

	function handleEntityChange(value: string) {
		entityFilter = value;
		page = 1;
		void loadLogs();
	}

	function handlePageChange(nextPage: number) {
		page = nextPage;
		void loadLogs();
	}

	function openDetail(row: Record<string, unknown>) {
		const entry = logs.find((log) => log.id === String(row.id));
		if (!entry) return;

		selected = entry;
		detailOpen = true;
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

	function formatJson(value: unknown) {
		if (value === null || value === undefined) return '—';

		if (typeof value === 'string') {
			try {
				return JSON.stringify(JSON.parse(value), null, 2);
			} catch {
				return value;
			}
		}

		return JSON.stringify(value, null, 2);
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Audit logs</h1>
		<p class="text-sm text-muted-foreground">
			Immutable record of administrative actions across the platform.
		</p>
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
				<Label for="audit-search">Search</Label>
				<Input
					id="audit-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder="Search by action"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="audit-entity-filter">Entity</Label>
				<Select.Root type="single" value={entityFilter} onValueChange={handleEntityChange}>
					<Select.Trigger id="audit-entity-filter" class="w-full">
						<Select.Value placeholder="All entities" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label="All entities">All entities</Select.Item>
						{#each entityTypes as entity (entity)}
							<Select.Item value={entity} label={entity}>{entity}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={logs as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No audit log entries match the current filters."
		{page}
		{pageSize}
		{total}
		onPageChange={handlePageChange}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'createdAt'}
				<span class="text-muted-foreground">{formatDate(String(row.createdAt ?? ''))}</span>
			{:else if column.key === 'actor'}
				{#if row.actorUserId}
					<code class="text-xs text-muted-foreground">{String(row.actorUserId)}</code>
				{:else}
					<span class="text-muted-foreground">system</span>
				{/if}
			{:else if column.key === 'action'}
				<code class="text-xs">{String(row.action ?? '')}</code>
			{:else if column.key === 'entity'}
				<div class="flex flex-col items-start gap-1">
					<Badge variant="outline">{String(row.entityType ?? '')}</Badge>
					{#if row.entityId}
						<code class="max-w-48 truncate text-xs text-muted-foreground">
							{String(row.entityId)}
						</code>
					{/if}
				</div>
			{:else if column.key === 'actions'}
				<Button
					variant="ghost"
					size="sm"
					aria-label="View audit entry"
					onclick={() => openDetail(row)}
				>
					<Eye class="size-4" />
					View
				</Button>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

<Sheet.Root bind:open={detailOpen}>
	<Sheet.Content class="w-full overflow-y-auto sm:max-w-lg">
		<Sheet.Header>
			<Sheet.Title>Audit entry</Sheet.Title>
			<Sheet.Description>
				{selected ? `${selected.action} · ${formatDate(selected.createdAt)}` : 'Entry details'}
			</Sheet.Description>
		</Sheet.Header>

		{#if selected}
			<div class="space-y-4 px-4 text-sm">
				<dl class="grid gap-3">
					<div class="space-y-1">
						<dt class="text-muted-foreground">Actor</dt>
						<dd class="font-mono text-xs break-all">{selected.actorUserId ?? 'system'}</dd>
					</div>
					<div class="space-y-1">
						<dt class="text-muted-foreground">Action</dt>
						<dd><code class="text-xs">{selected.action}</code></dd>
					</div>
					<div class="space-y-1">
						<dt class="text-muted-foreground">Entity</dt>
						<dd class="space-y-1">
							<Badge variant="outline">{selected.entityType}</Badge>
							{#if selected.entityId}
								<p class="font-mono text-xs break-all text-muted-foreground">
									{selected.entityId}
								</p>
							{/if}
						</dd>
					</div>
					<div class="space-y-1">
						<dt class="text-muted-foreground">IP address</dt>
						<dd>{selected.ipAddress ?? '—'}</dd>
					</div>
					<div class="space-y-1">
						<dt class="text-muted-foreground">User agent</dt>
						<dd class="break-words text-muted-foreground">{selected.userAgent ?? '—'}</dd>
					</div>
				</dl>

				<div class="space-y-2">
					<h3 class="text-sm font-medium">Before</h3>
					<pre
						class="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs whitespace-pre-wrap">{formatJson(
							selected.beforeJson
						)}</pre>
				</div>

				<div class="space-y-2">
					<h3 class="text-sm font-medium">After</h3>
					<pre
						class="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs whitespace-pre-wrap">{formatJson(
							selected.afterJson
						)}</pre>
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-center px-4 py-10">
				<LoaderCircle class="size-5 animate-spin text-muted-foreground" />
			</div>
		{/if}

		<Sheet.Footer>
			<Button variant="outline" onclick={() => (detailOpen = false)}>Close</Button>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>

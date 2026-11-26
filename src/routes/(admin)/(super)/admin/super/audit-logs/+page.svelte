<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Eye, LoaderCircle } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { auditActionLabel } from '#lib/frontend/i18n/labels.ts';
	import { formatDateTime } from '#lib/frontend/modules/commerce/format.ts';
	import { entityLabel } from '../entity-label.ts';
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

	const columns = $derived([
		{ key: 'createdAt', label: m.admin_super_col_time() },
		{ key: 'actor', label: m.admin_super_col_actor() },
		{ key: 'action', label: m.admin_super_col_action() },
		{ key: 'entity', label: m.admin_super_col_entity() },
		{ key: 'actions', label: '', class: 'text-right' }
	]);

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

			if (!response.ok) throw payload;

			logs = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = errorMessage(err, 'admin_super_audit_load_failed');
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

	function formatJson(value: unknown) {
		if (value === null || value === undefined) return m.common_dash();

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
		<h1 class="text-2xl font-semibold tracking-tight">{m.admin_super_audit_title()}</h1>
		<p class="text-sm text-muted-foreground">
			{m.admin_super_audit_subtitle()}
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
				<Label for="audit-search">{m.common_search()}</Label>
				<Input
					id="audit-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder={m.admin_super_audit_search_placeholder()}
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="audit-entity-filter">{m.admin_super_col_entity()}</Label>
				<Select.Root type="single" value={entityFilter} onValueChange={handleEntityChange}>
					<Select.Trigger id="audit-entity-filter" class="w-full">
						<Select.Value placeholder={m.admin_super_audit_all_entities()} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label={m.admin_super_audit_all_entities()}>
							{m.admin_super_audit_all_entities()}
						</Select.Item>
						{#each entityTypes as entity (entity)}
							<Select.Item value={entity} label={entityLabel(entity)}>
								{entityLabel(entity)}
							</Select.Item>
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
		emptyMessage={m.admin_super_audit_empty()}
		{page}
		{pageSize}
		{total}
		onPageChange={handlePageChange}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'createdAt'}
				<span class="text-muted-foreground"
					>{formatDateTime(String(row.createdAt ?? '')) || m.common_dash()}</span
				>
			{:else if column.key === 'actor'}
				{#if row.actorUserId}
					<code class="text-xs text-muted-foreground">{String(row.actorUserId)}</code>
				{:else}
					<span class="text-muted-foreground">{m.admin_super_actor_system()}</span>
				{/if}
			{:else if column.key === 'action'}
				<code class="text-xs">{auditActionLabel(String(row.action ?? ''))}</code>
			{:else if column.key === 'entity'}
				<div class="flex flex-col items-start gap-1">
					<Badge variant="outline">{entityLabel(String(row.entityType ?? ''))}</Badge>
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
					aria-label={m.admin_super_audit_view_entry()}
					onclick={() => openDetail(row)}
				>
					<Eye class="size-4" />
					{m.common_view()}
				</Button>
			{:else}
				{String(row[column.key] ?? m.common_dash())}
			{/if}
		{/snippet}
	</DataTable>
</div>

<Sheet.Root bind:open={detailOpen}>
	<Sheet.Content class="w-full overflow-y-auto sm:max-w-lg">
		<Sheet.Header>
			<Sheet.Title>{m.admin_super_audit_entry_title()}</Sheet.Title>
			<Sheet.Description>
				{selected
					? `${auditActionLabel(selected.action)} · ${formatDateTime(selected.createdAt)}`
					: m.admin_super_audit_entry_details()}
			</Sheet.Description>
		</Sheet.Header>

		{#if selected}
			<div class="space-y-4 px-4 text-sm">
				<dl class="grid gap-3">
					<div class="space-y-1">
						<dt class="text-muted-foreground">{m.admin_super_col_actor()}</dt>
						<dd class="font-mono text-xs break-all">
							{selected.actorUserId ?? m.admin_super_actor_system()}
						</dd>
					</div>
					<div class="space-y-1">
						<dt class="text-muted-foreground">{m.admin_super_col_action()}</dt>
						<dd><code class="text-xs">{auditActionLabel(selected.action)}</code></dd>
					</div>
					<div class="space-y-1">
						<dt class="text-muted-foreground">{m.admin_super_col_entity()}</dt>
						<dd class="space-y-1">
							<Badge variant="outline">{entityLabel(selected.entityType)}</Badge>
							{#if selected.entityId}
								<p class="font-mono text-xs break-all text-muted-foreground">
									{selected.entityId}
								</p>
							{/if}
						</dd>
					</div>
					<div class="space-y-1">
						<dt class="text-muted-foreground">{m.admin_super_audit_ip()}</dt>
						<dd>{selected.ipAddress ?? m.common_dash()}</dd>
					</div>
					<div class="space-y-1">
						<dt class="text-muted-foreground">{m.admin_super_audit_user_agent()}</dt>
						<dd class="break-words text-muted-foreground">
							{selected.userAgent ?? m.common_dash()}
						</dd>
					</div>
				</dl>

				<div class="space-y-2">
					<h3 class="text-sm font-medium">{m.admin_super_audit_before()}</h3>
					<pre
						class="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs whitespace-pre-wrap">{formatJson(
							selected.beforeJson
						)}</pre>
				</div>

				<div class="space-y-2">
					<h3 class="text-sm font-medium">{m.admin_super_audit_after()}</h3>
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
			<Button variant="outline" onclick={() => (detailOpen = false)}>{m.common_close()}</Button>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>

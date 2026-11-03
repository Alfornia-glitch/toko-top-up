<script lang="ts">
	import { onMount } from 'svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Badge, type BadgeVariant } from '#lib/frontend/components/ui/badge/index.ts';

	type AdminRow = {
		id: string;
		name: string | null;
		email: string;
		role: string;
		banned: boolean;
		createdAt: string;
	};

	const columns = [
		{ key: 'name', label: 'Name' },
		{ key: 'email', label: 'Email' },
		{ key: 'role', label: 'Role' },
		{ key: 'banned', label: 'Status' },
		{ key: 'createdAt', label: 'Joined' }
	];

	let admins = $state<AdminRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(() => {
		void loadAdmins();
	});

	async function loadAdmins() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/admin/super/admins');
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load admins');

			admins = payload.data ?? [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load admins';
		} finally {
			loading = false;
		}
	}

	function roleVariant(role: string): BadgeVariant {
		return role === 'superadmin' ? 'default' : 'secondary';
	}

	function formatDate(value: string) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Admins</h1>
		<p class="text-sm text-muted-foreground">Staff accounts with administrative access.</p>
	</div>

	{#if error}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
			role="alert"
		>
			{error}
		</div>
	{/if}

	<DataTable
		{columns}
		rows={admins as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No admins found."
		pageSize={Math.max(1, admins.length)}
		total={admins.length}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'name'}
				<a href={`/admin/super/users/${String(row.id)}`} class="font-medium hover:underline">
					{String(row.name ?? 'Unnamed user')}
				</a>
			{:else if column.key === 'email'}
				<span class="text-muted-foreground">{String(row.email ?? '')}</span>
			{:else if column.key === 'role'}
				<Badge variant={roleVariant(String(row.role ?? ''))} class="capitalize">
					{String(row.role ?? '')}
				</Badge>
			{:else if column.key === 'banned'}
				<StatusBadge status={row.banned ? 'banned' : 'active'} />
			{:else if column.key === 'createdAt'}
				<span class="text-muted-foreground">{formatDate(String(row.createdAt ?? ''))}</span>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

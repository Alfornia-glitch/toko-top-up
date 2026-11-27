<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { roleLabel } from '#lib/frontend/i18n/labels.ts';
	import { formatDate } from '#lib/frontend/modules/commerce/format.ts';
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

	const columns = $derived([
		{ key: 'name', label: m.common_name() },
		{ key: 'email', label: m.common_email() },
		{ key: 'role', label: m.admin_super_col_role() },
		{ key: 'banned', label: m.common_status() },
		{ key: 'createdAt', label: m.admin_super_col_joined() }
	]);

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

			if (!response.ok) throw payload;

			admins = payload.data ?? [];
		} catch (err) {
			error = errorMessage(err, 'admin_super_admins_load_failed');
		} finally {
			loading = false;
		}
	}

	function roleVariant(role: string): BadgeVariant {
		return role === 'superadmin' ? 'default' : 'secondary';
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{m.admin_super_admins_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.admin_super_admins_subtitle()}</p>
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
		emptyMessage={m.admin_super_admins_empty()}
		pageSize={Math.max(1, admins.length)}
		total={admins.length}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'name'}
				<a href={`/admin/super/users/${String(row.id)}`} class="font-medium hover:underline">
					{String(row.name ?? m.admin_super_unnamed_user())}
				</a>
			{:else if column.key === 'email'}
				<span class="text-muted-foreground">{String(row.email ?? '')}</span>
			{:else if column.key === 'role'}
				<Badge variant={roleVariant(String(row.role ?? ''))}>
					{roleLabel(String(row.role ?? ''))}
				</Badge>
			{:else if column.key === 'banned'}
				<StatusBadge status={row.banned ? 'banned' : 'active'} />
			{:else if column.key === 'createdAt'}
				<span class="text-muted-foreground"
					>{formatDate(String(row.createdAt ?? '')) || m.common_dash()}</span
				>
			{:else}
				{String(row[column.key] ?? m.common_dash())}
			{/if}
		{/snippet}
	</DataTable>
</div>

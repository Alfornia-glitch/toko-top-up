<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Badge, type BadgeVariant } from '#lib/frontend/components/ui/badge/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { roleLabel } from '#lib/frontend/i18n/labels.ts';
	import { formatDate } from '#lib/frontend/modules/commerce/format.ts';

	type UserRow = {
		id: string;
		name: string | null;
		email: string;
		role: string;
		banned: boolean;
		banReason: string | null;
		emailVerified: boolean;
		createdAt: string;
	};

	const columns = $derived([
		{ key: 'name', label: m.common_name() },
		{ key: 'email', label: m.common_email() },
		{ key: 'role', label: m.admin_super_col_role() },
		{ key: 'banned', label: m.admin_super_users_col_banned() },
		{ key: 'emailVerified', label: m.admin_super_users_col_verified() },
		{ key: 'createdAt', label: m.admin_super_col_joined() }
	]);

	const pageSize = 25;

	let users = $state<UserRow[]>([]);
	let loading = $state(true);
	let error = $state('');
	let q = $state('');
	let roleFilter = $state('all');
	let page = $state(1);
	let total = $state(0);

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		void loadUsers();
	});

	onDestroy(() => {
		if (searchTimer) clearTimeout(searchTimer);
	});

	async function loadUsers() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams();
			params.set('page', String(page));
			params.set('pageSize', String(pageSize));
			if (q.trim()) params.set('q', q.trim());
			if (roleFilter !== 'all') params.set('status', roleFilter);

			const response = await fetch(`/api/admin/super/users?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw payload;

			users = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = errorMessage(err, 'admin_super_users_load_failed');
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		if (searchTimer) clearTimeout(searchTimer);

		searchTimer = setTimeout(() => {
			page = 1;
			void loadUsers();
		}, 300);
	}

	function handleRoleChange(value: string) {
		roleFilter = value;
		page = 1;
		void loadUsers();
	}

	function handlePageChange(nextPage: number) {
		page = nextPage;
		void loadUsers();
	}

	function roleVariant(role: string): BadgeVariant {
		if (role === 'superadmin') return 'default';
		if (role === 'admin') return 'secondary';
		return 'outline';
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{m.admin_super_users_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.admin_super_users_subtitle()}</p>
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
				<Label for="user-search">{m.common_search()}</Label>
				<Input
					id="user-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder={m.admin_super_users_search_placeholder()}
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="user-role-filter">{m.admin_super_col_role()}</Label>
				<Select.Root type="single" value={roleFilter} onValueChange={handleRoleChange}>
					<Select.Trigger id="user-role-filter" class="w-full">
						<Select.Value placeholder={m.admin_super_users_all_roles()} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label={m.admin_super_users_all_roles()}>
							{m.admin_super_users_all_roles()}
						</Select.Item>
						<Select.Item value="customer" label={roleLabel('customer')}>
							{roleLabel('customer')}
						</Select.Item>
						<Select.Item value="admin" label={roleLabel('admin')}>
							{roleLabel('admin')}
						</Select.Item>
						<Select.Item value="superadmin" label={roleLabel('superadmin')}>
							{roleLabel('superadmin')}
						</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={users as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage={m.admin_super_users_empty()}
		{page}
		{pageSize}
		{total}
		onPageChange={handlePageChange}
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
			{:else if column.key === 'emailVerified'}
				<Badge variant={row.emailVerified ? 'secondary' : 'outline'}>
					{row.emailVerified ? m.admin_super_user_verified() : m.admin_super_user_unverified()}
				</Badge>
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

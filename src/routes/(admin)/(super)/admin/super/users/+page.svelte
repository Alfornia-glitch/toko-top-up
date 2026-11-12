<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Badge, type BadgeVariant } from '#lib/frontend/components/ui/badge/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';

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

	const columns = [
		{ key: 'name', label: 'Name' },
		{ key: 'email', label: 'Email' },
		{ key: 'role', label: 'Role' },
		{ key: 'banned', label: 'Banned' },
		{ key: 'emailVerified', label: 'Verified' },
		{ key: 'createdAt', label: 'Joined' }
	];

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

			if (!response.ok) throw new Error(payload.error ?? 'Could not load users');

			users = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load users';
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
		<h1 class="text-2xl font-semibold tracking-tight">Users</h1>
		<p class="text-sm text-muted-foreground">Browse accounts, roles and ban status.</p>
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
				<Label for="user-search">Search</Label>
				<Input
					id="user-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder="Search name or email"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="user-role-filter">Role</Label>
				<Select.Root type="single" value={roleFilter} onValueChange={handleRoleChange}>
					<Select.Trigger id="user-role-filter" class="w-full">
						<Select.Value placeholder="All roles" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label="All roles">All roles</Select.Item>
						<Select.Item value="customer" label="Customer">Customer</Select.Item>
						<Select.Item value="admin" label="Admin">Admin</Select.Item>
						<Select.Item value="superadmin" label="Superadmin">Superadmin</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={users as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No users match the current filters."
		{page}
		{pageSize}
		{total}
		onPageChange={handlePageChange}
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
			{:else if column.key === 'emailVerified'}
				<Badge variant={row.emailVerified ? 'secondary' : 'outline'}>
					{row.emailVerified ? 'Verified' : 'Unverified'}
				</Badge>
			{:else if column.key === 'createdAt'}
				<span class="text-muted-foreground">{formatDate(String(row.createdAt ?? ''))}</span>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

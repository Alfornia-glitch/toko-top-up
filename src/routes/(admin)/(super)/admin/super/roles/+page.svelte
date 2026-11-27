<script lang="ts">
	import { onMount } from 'svelte';
	import { Check, LoaderCircle, Minus } from '@lucide/svelte';
	import { Badge, type BadgeVariant } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { roleLabel } from '#lib/frontend/i18n/labels.ts';

	type RoleCount = {
		role: string;
		count: number;
	};

	type RolesPayload = {
		matrix: Record<string, string[]>;
		counts: RoleCount[];
	};

	const roleOrder = ['customer', 'admin', 'superadmin'];

	// The API sends permission descriptions in English; map the known ones to messages.
	// Functions, so the locale is read at render time.
	const permissionMessages: Record<string, () => string> = {
		'Read storefront': () => m.admin_super_perm_read_storefront(),
		'Manage own profile': () => m.admin_super_perm_manage_own_profile(),
		'View own orders': () => m.admin_super_perm_view_own_orders(),
		'Submit returns': () => m.admin_super_perm_submit_returns(),
		'Open support tickets': () => m.admin_super_perm_open_support_tickets(),
		'All customer permissions': () => m.admin_super_perm_all_customer(),
		'Manage catalog': () => m.admin_super_perm_manage_catalog(),
		'Manage inventory': () => m.admin_super_perm_manage_inventory(),
		'Process orders': () => m.admin_super_perm_process_orders(),
		'Manage returns': () => m.admin_super_perm_manage_returns(),
		'Moderate reviews': () => m.admin_super_perm_moderate_reviews(),
		'Manage marketing and content': () => m.admin_super_perm_manage_marketing(),
		'All admin permissions': () => m.admin_super_perm_all_admin(),
		'Manage users and roles': () => m.admin_super_perm_manage_users_roles(),
		'Ban users': () => m.admin_super_perm_ban_users(),
		'View audit logs': () => m.admin_super_perm_view_audit_logs(),
		'Manage settings and integrations': () => m.admin_super_perm_manage_settings(),
		'Danger zone': () => m.admin_super_perm_danger_zone()
	};

	function permissionLabel(permission: string) {
		return Object.hasOwn(permissionMessages, permission)
			? permissionMessages[permission]()
			: permission;
	}

	let payload = $state<RolesPayload | null>(null);
	let loading = $state(true);
	let error = $state('');

	const permissions = $derived.by(() => {
		if (!payload) return [];

		const list: string[] = [];

		for (const role of roleOrder) {
			for (const permission of payload.matrix[role] ?? []) {
				if (list.includes(permission)) continue;
				list.push(permission);
			}
		}

		return list;
	});

	onMount(() => {
		void loadRoles();
	});

	async function loadRoles() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/admin/super/roles');
			const body = await response.json().catch(() => ({}));

			if (!response.ok) throw body;

			payload = body.data as RolesPayload;
		} catch (err) {
			error = errorMessage(err, 'admin_super_roles_load_failed');
		} finally {
			loading = false;
		}
	}

	function roleVariant(role: string): BadgeVariant {
		if (role === 'superadmin') return 'default';
		if (role === 'admin') return 'secondary';
		return 'outline';
	}

	function countFor(role: string) {
		return payload?.counts.find((item) => item.role === role)?.count ?? 0;
	}

	function hasPermission(role: string, permission: string) {
		return (payload?.matrix[role] ?? []).includes(permission);
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{m.admin_super_roles_title()}</h1>
		<p class="text-sm text-muted-foreground">
			{m.admin_super_roles_subtitle()}
		</p>
	</div>

	{#if loading}
		<div class="flex h-64 items-center justify-center">
			<LoaderCircle class="size-6 animate-spin text-muted-foreground" />
		</div>
	{:else if error}
		<Card.Root>
			<Card.Content class="space-y-4 py-10 text-center">
				<p class="text-sm text-destructive">{error}</p>
				<Button onclick={() => void loadRoles()}>{m.common_retry()}</Button>
			</Card.Content>
		</Card.Root>
	{:else if payload}
		<div class="grid gap-4 sm:grid-cols-3">
			{#each roleOrder as role (role)}
				<Card.Root>
					<Card.Content class="flex items-center justify-between gap-3">
						<div class="space-y-1">
							<Badge variant={roleVariant(role)}>{roleLabel(role)}</Badge>
							<p class="text-sm text-muted-foreground">{m.admin_super_roles_accounts()}</p>
						</div>
						<p class="text-3xl font-semibold tracking-tight">{countFor(role)}</p>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>{m.admin_super_roles_matrix_title()}</Card.Title>
				<Card.Description>
					{m.admin_super_roles_matrix_desc()}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="overflow-hidden rounded-lg border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>{m.admin_super_roles_permission()}</Table.Head>
								{#each roleOrder as role (role)}
									<Table.Head class="text-center">
										<span class="inline-flex items-center gap-2">
											{roleLabel(role)}
											<Badge variant={roleVariant(role)}>{countFor(role)}</Badge>
										</span>
									</Table.Head>
								{/each}
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#if permissions.length === 0}
								<Table.Row>
									<Table.Cell
										colspan={roleOrder.length + 1}
										class="h-24 text-center text-muted-foreground"
									>
										{m.admin_super_roles_no_permissions()}
									</Table.Cell>
								</Table.Row>
							{:else}
								{#each permissions as permission (permission)}
									<Table.Row>
										<Table.Cell class="font-medium">{permissionLabel(permission)}</Table.Cell>
										{#each roleOrder as role (role)}
											<Table.Cell class="text-center">
												{#if hasPermission(role, permission)}
													<Check class="mx-auto size-4 text-success" />
													<span class="sr-only">{m.admin_super_roles_granted()}</span>
												{:else}
													<Minus class="mx-auto size-4 text-muted-foreground" />
													<span class="sr-only">{m.admin_super_roles_not_granted()}</span>
												{/if}
											</Table.Cell>
										{/each}
									</Table.Row>
								{/each}
							{/if}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content class="py-10 text-center text-sm text-muted-foreground">
				{m.admin_super_roles_no_data()}
			</Card.Content>
		</Card.Root>
	{/if}
</div>

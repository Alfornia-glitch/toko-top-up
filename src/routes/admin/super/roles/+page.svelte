<script lang="ts">
	import { onMount } from 'svelte';
	import { Check, LoaderCircle, Minus } from '@lucide/svelte';
	import { Badge, type BadgeVariant } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';

	type RoleCount = {
		role: string;
		count: number;
	};

	type RolesPayload = {
		matrix: Record<string, string[]>;
		counts: RoleCount[];
	};

	const roleOrder = ['customer', 'admin', 'superadmin'];

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

			if (!response.ok) throw new Error(body.error ?? 'Could not load roles');

			payload = body.data as RolesPayload;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load roles';
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
		<h1 class="text-2xl font-semibold tracking-tight">Roles &amp; permissions</h1>
		<p class="text-sm text-muted-foreground">
			Compare what each role can do across the admin console.
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
				<Button onclick={() => void loadRoles()}>Try again</Button>
			</Card.Content>
		</Card.Root>
	{:else if payload}
		<div class="grid gap-4 sm:grid-cols-3">
			{#each roleOrder as role (role)}
				<Card.Root>
					<Card.Content class="flex items-center justify-between gap-3">
						<div class="space-y-1">
							<Badge variant={roleVariant(role)} class="capitalize">{role}</Badge>
							<p class="text-sm text-muted-foreground">Accounts with this role</p>
						</div>
						<p class="text-3xl font-semibold tracking-tight">{countFor(role)}</p>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Permission matrix</Card.Title>
				<Card.Description>
					Capabilities granted to each role, grouped by the highest role that introduces them.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="overflow-hidden rounded-lg border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Permission</Table.Head>
								{#each roleOrder as role (role)}
									<Table.Head class="text-center capitalize">
										<span class="inline-flex items-center gap-2">
											{role}
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
										No permissions configured.
									</Table.Cell>
								</Table.Row>
							{:else}
								{#each permissions as permission (permission)}
									<Table.Row>
										<Table.Cell class="font-medium">{permission}</Table.Cell>
										{#each roleOrder as role (role)}
											<Table.Cell class="text-center">
												{#if hasPermission(role, permission)}
													<Check class="mx-auto size-4 text-emerald-600" />
													<span class="sr-only">Granted</span>
												{:else}
													<Minus class="mx-auto size-4 text-muted-foreground" />
													<span class="sr-only">Not granted</span>
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
				No role data available.
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import {
		AlertTriangle,
		Database,
		Package,
		Plug,
		ScrollText,
		Server,
		Settings,
		ShoppingCart,
		UserCog,
		Users
	} from '@lucide/svelte';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import StatCard from '#lib/frontend/components/admin/StatCard.svelte';

	type Stats = {
		users: number;
		admins: number;
		orders: number;
		products: number;
		paidOrders: number;
		auditEntries: number;
	};

	type AuditRow = {
		id: string;
		actorUserId: string | null;
		action: string;
		entityType: string;
		entityId: string | null;
		createdAt: string;
	};

	type QuickLink = {
		href: string;
		title: string;
		description: string;
		icon: Component<{ class?: string }>;
	};

	const quickLinks: QuickLink[] = [
		{
			href: '/admin/super/settings',
			title: 'Settings',
			description: 'Key/value platform configuration.',
			icon: Settings
		},
		{
			href: '/admin/super/integrations',
			title: 'Integrations',
			description: 'Provider and credential status.',
			icon: Plug
		},
		{
			href: '/admin/super/storage',
			title: 'Storage',
			description: 'Media usage and recent uploads.',
			icon: Database
		},
		{
			href: '/admin/super/system',
			title: 'System',
			description: 'Runtime, providers and record counts.',
			icon: Server
		},
		{
			href: '/admin/super/danger',
			title: 'Danger zone',
			description: 'Destructive maintenance actions.',
			icon: AlertTriangle
		}
	];

	let stats = $state<Stats | null>(null);
	let logs = $state<AuditRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	function formatDate(value: string) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	onMount(() => {
		void load();
	});

	async function load() {
		loading = true;
		error = '';

		try {
			const [statsResponse, auditResponse] = await Promise.all([
				fetch('/api/admin/super/stats'),
				fetch('/api/admin/super/audit-logs?pageSize=5')
			]);
			const statsPayload = await statsResponse.json().catch(() => ({}));
			const auditPayload = await auditResponse.json().catch(() => ({}));

			if (!statsResponse.ok) throw new Error(statsPayload.error ?? 'Could not load stats');
			if (!auditResponse.ok) throw new Error(auditPayload.error ?? 'Could not load audit logs');

			stats = statsPayload.data;
			logs = auditPayload.data ?? [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load overview';
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Superadmin overview</h1>
		<p class="text-sm text-muted-foreground">Platform-wide health and recent activity.</p>
	</div>

	{#if error}
		<Card.Root>
			<Card.Content class="py-6 text-sm text-destructive">{error}</Card.Content>
		</Card.Root>
	{/if}

	{#if loading}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
			{#each Array(6) as _, index (index)}
				<Skeleton class="h-28 w-full rounded-xl" />
			{/each}
		</div>
		<Skeleton class="h-64 w-full rounded-xl" />
	{:else if stats}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
			<StatCard title="Users" value={stats.users} hint="Registered accounts" icon={Users} />
			<StatCard title="Admins" value={stats.admins} hint="Admin role" icon={UserCog} />
			<StatCard title="Orders" value={stats.orders} hint="All time" icon={ShoppingCart} />
			<StatCard title="Paid orders" value={stats.paidOrders} hint="Settled" icon={Package} />
			<StatCard title="Products" value={stats.products} hint="In catalog" icon={Package} />
			<StatCard
				title="Audit entries"
				value={stats.auditEntries}
				hint="Logged actions"
				icon={ScrollText}
			/>
		</div>

		<Card.Root>
			<Card.Header class="flex flex-row items-start justify-between gap-3 space-y-0">
				<div>
					<Card.Title>Recent audit activity</Card.Title>
					<Card.Description>The latest recorded admin actions.</Card.Description>
				</div>
				<a href="/admin/super/audit-logs" class="text-sm font-medium hover:underline"> View all </a>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Action</Table.Head>
							<Table.Head>Entity</Table.Head>
							<Table.Head>Entity ID</Table.Head>
							<Table.Head>Actor</Table.Head>
							<Table.Head>When</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if logs.length === 0}
							<Table.Row>
								<Table.Cell colspan={5} class="h-24 text-center text-muted-foreground">
									No audit activity yet.
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each logs as log (log.id)}
								<Table.Row>
									<Table.Cell>
										<code class="text-xs font-medium">{log.action}</code>
									</Table.Cell>
									<Table.Cell class="text-muted-foreground">{log.entityType}</Table.Cell>
									<Table.Cell class="text-muted-foreground">{log.entityId ?? '—'}</Table.Cell>
									<Table.Cell class="text-muted-foreground"
										>{log.actorUserId ?? 'System'}</Table.Cell
									>
									<Table.Cell class="text-muted-foreground">{formatDate(log.createdAt)}</Table.Cell>
								</Table.Row>
							{/each}
						{/if}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each quickLinks as link (link.href)}
				{@const Icon = link.icon}
				<a href={link.href} class="group block">
					<Card.Root class="h-full transition-colors group-hover:border-primary/50">
						<Card.Header class="flex flex-row items-center gap-2 space-y-0">
							<Icon class="size-4 text-muted-foreground" />
							<Card.Title class="text-base">{link.title}</Card.Title>
						</Card.Header>
						<Card.Content>
							<p class="text-sm text-muted-foreground">{link.description}</p>
						</Card.Content>
					</Card.Root>
				</a>
			{/each}
		</div>
	{/if}
</div>

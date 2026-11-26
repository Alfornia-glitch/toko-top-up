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
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { auditActionLabel } from '#lib/frontend/i18n/labels.ts';
	import { formatDateTime } from '#lib/frontend/modules/commerce/format.ts';
	import { entityLabel } from './entity-label.ts';

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

	const quickLinks: QuickLink[] = $derived([
		{
			href: '/admin/super/settings',
			title: m.common_settings(),
			description: m.admin_super_link_settings_desc(),
			icon: Settings
		},
		{
			href: '/admin/super/integrations',
			title: m.admin_super_integrations_title(),
			description: m.admin_super_link_integrations_desc(),
			icon: Plug
		},
		{
			href: '/admin/super/storage',
			title: m.admin_super_storage_title(),
			description: m.admin_super_link_storage_desc(),
			icon: Database
		},
		{
			href: '/admin/super/system',
			title: m.admin_super_system_title(),
			description: m.admin_super_link_system_desc(),
			icon: Server
		},
		{
			href: '/admin/super/danger',
			title: m.admin_super_danger_title(),
			description: m.admin_super_link_danger_desc(),
			icon: AlertTriangle
		}
	]);

	let stats = $state<Stats | null>(null);
	let logs = $state<AuditRow[]>([]);
	let loading = $state(true);
	let error = $state('');

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

			if (!statsResponse.ok) throw statsPayload;
			if (!auditResponse.ok) throw auditPayload;

			stats = statsPayload.data;
			logs = auditPayload.data ?? [];
		} catch (err) {
			error = errorMessage(err, 'admin_super_overview_load_failed');
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{m.admin_super_overview_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.admin_super_overview_subtitle()}</p>
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
			<StatCard
				title={m.admin_super_stat_users()}
				value={stats.users}
				hint={m.admin_super_stat_users_hint()}
				icon={Users}
			/>
			<StatCard
				title={m.admin_super_stat_admins()}
				value={stats.admins}
				hint={m.admin_super_stat_admins_hint()}
				icon={UserCog}
			/>
			<StatCard
				title={m.common_orders()}
				value={stats.orders}
				hint={m.admin_super_stat_all_time()}
				icon={ShoppingCart}
			/>
			<StatCard
				title={m.admin_super_stat_paid_orders()}
				value={stats.paidOrders}
				hint={m.admin_super_stat_paid_orders_hint()}
				icon={Package}
			/>
			<StatCard
				title={m.common_products()}
				value={stats.products}
				hint={m.admin_super_stat_in_catalog()}
				icon={Package}
			/>
			<StatCard
				title={m.admin_super_stat_audit_entries()}
				value={stats.auditEntries}
				hint={m.admin_super_stat_audit_entries_hint()}
				icon={ScrollText}
			/>
		</div>

		<Card.Root>
			<Card.Header class="flex flex-row items-start justify-between gap-3 space-y-0">
				<div>
					<Card.Title>{m.admin_super_overview_recent_title()}</Card.Title>
					<Card.Description>{m.admin_super_overview_recent_desc()}</Card.Description>
				</div>
				<a href="/admin/super/audit-logs" class="text-sm font-medium hover:underline">
					{m.common_view_all()}
				</a>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{m.admin_super_col_action()}</Table.Head>
							<Table.Head>{m.admin_super_col_entity()}</Table.Head>
							<Table.Head>{m.admin_super_col_entity_id()}</Table.Head>
							<Table.Head>{m.admin_super_col_actor()}</Table.Head>
							<Table.Head>{m.admin_super_col_when()}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if logs.length === 0}
							<Table.Row>
								<Table.Cell colspan={5} class="h-24 text-center text-muted-foreground">
									{m.admin_super_overview_no_activity()}
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each logs as log (log.id)}
								<Table.Row>
									<Table.Cell>
										<code class="text-xs font-medium">{auditActionLabel(log.action)}</code>
									</Table.Cell>
									<Table.Cell class="text-muted-foreground"
										>{entityLabel(log.entityType)}</Table.Cell
									>
									<Table.Cell class="text-muted-foreground"
										>{log.entityId ?? m.common_dash()}</Table.Cell
									>
									<Table.Cell class="text-muted-foreground"
										>{log.actorUserId ?? m.admin_super_actor_system()}</Table.Cell
									>
									<Table.Cell class="text-muted-foreground"
										>{formatDateTime(log.createdAt) || m.common_dash()}</Table.Cell
									>
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

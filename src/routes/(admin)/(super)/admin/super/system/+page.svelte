<script lang="ts">
	import { onMount } from 'svelte';
	import { Clock, Cpu, HardDrive, MemoryStick } from '@lucide/svelte';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import StatCard from '#lib/frontend/components/admin/StatCard.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import {
		formatBytes,
		formatDuration,
		formatNumber
	} from '#lib/frontend/modules/commerce/format.ts';

	type SystemInfo = {
		runtimeVersion: string;
		uptimeSeconds: number;
		nodeEnv: string;
		dbProvider: string;
		storageProvider: string;
		counts: { users: number; products: number; orders: number; media: number; audit: number };
		mediaBytes: number;
		memoryBytes: number;
	};

	let system = $state<SystemInfo | null>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(() => {
		void load();
	});

	async function load() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/admin/super/system');
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw payload;

			system = payload.data;
		} catch (err) {
			error = errorMessage(err, 'admin_super_system_load_failed');
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{m.admin_super_system_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.admin_super_system_subtitle()}</p>
	</div>

	{#if error}
		<Card.Root>
			<Card.Content class="py-6 text-sm text-destructive">{error}</Card.Content>
		</Card.Root>
	{/if}

	{#if loading}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each Array(4) as _, index (index)}
				<Skeleton class="h-28 w-full rounded-xl" />
			{/each}
		</div>
		<Skeleton class="h-64 w-full rounded-xl" />
	{:else if system}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<StatCard
				title={m.admin_super_system_node_version()}
				value={system.runtimeVersion}
				hint={m.admin_super_system_runtime_hint()}
				icon={Cpu}
			/>
			<StatCard
				title={m.admin_super_system_uptime()}
				value={formatDuration(system.uptimeSeconds * 1000)}
				hint={m.admin_super_system_uptime_hint()}
				icon={Clock}
			/>
			<StatCard
				title={m.admin_super_system_media_stored()}
				value={formatBytes(system.mediaBytes)}
				hint={m.admin_super_system_media_hint()}
				icon={HardDrive}
			/>
			<StatCard
				title={m.admin_super_system_memory()}
				value={formatBytes(system.memoryBytes)}
				hint={m.admin_super_system_memory_hint()}
				icon={MemoryStick}
			/>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>{m.admin_super_system_runtime_title()}</Card.Title>
					<Card.Description>{m.admin_super_system_runtime_desc()}</Card.Description>
				</Card.Header>
				<Card.Content>
					<dl class="grid gap-3 text-sm">
						<div class="flex items-center justify-between gap-3 border-b pb-2">
							<dt class="text-muted-foreground">{m.admin_super_system_environment()}</dt>
							<dd class="font-medium">{system.nodeEnv}</dd>
						</div>
						<div class="flex items-center justify-between gap-3 border-b pb-2">
							<dt class="text-muted-foreground">{m.admin_super_system_db_provider()}</dt>
							<dd><code class="text-sm font-medium">{system.dbProvider}</code></dd>
						</div>
						<div class="flex items-center justify-between gap-3">
							<dt class="text-muted-foreground">{m.admin_super_system_storage_provider()}</dt>
							<dd><code class="text-sm font-medium">{system.storageProvider}</code></dd>
						</div>
					</dl>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{m.admin_super_system_records_title()}</Card.Title>
					<Card.Description>{m.admin_super_system_records_desc()}</Card.Description>
				</Card.Header>
				<Card.Content>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>{m.admin_super_system_col_table()}</Table.Head>
								<Table.Head class="text-right">{m.admin_super_system_col_rows()}</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							<Table.Row>
								<Table.Cell>{m.admin_super_stat_users()}</Table.Cell>
								<Table.Cell class="text-right">{formatNumber(system.counts.users)}</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>{m.common_products()}</Table.Cell>
								<Table.Cell class="text-right">{formatNumber(system.counts.products)}</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>{m.common_orders()}</Table.Cell>
								<Table.Cell class="text-right">{formatNumber(system.counts.orders)}</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>{m.admin_super_system_media()}</Table.Cell>
								<Table.Cell class="text-right">{formatNumber(system.counts.media)}</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>{m.admin_super_stat_audit_entries()}</Table.Cell>
								<Table.Cell class="text-right">{formatNumber(system.counts.audit)}</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>

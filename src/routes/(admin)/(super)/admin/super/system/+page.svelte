<script lang="ts">
	import { onMount } from 'svelte';
	import { Clock, Cpu, HardDrive, MemoryStick } from '@lucide/svelte';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import StatCard from '#lib/frontend/components/admin/StatCard.svelte';

	type SystemInfo = {
		bunVersion: string;
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

	function formatBytes(bytes: number) {
		if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

		const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
		const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
		const value = bytes / 1024 ** exponent;

		return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
	}

	function formatUptime(seconds: number) {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (days > 0) return `${days}d ${hours}h ${minutes}m`;
		if (hours > 0) return `${hours}h ${minutes}m`;

		return `${minutes}m`;
	}

	onMount(() => {
		void load();
	});

	async function load() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/admin/super/system');
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load system info');

			system = payload.data;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load system info';
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">System</h1>
		<p class="text-sm text-muted-foreground">Runtime environment, providers and record counts.</p>
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
			<StatCard title="Bun version" value={system.bunVersion} hint="Runtime" icon={Cpu} />
			<StatCard
				title="Uptime"
				value={formatUptime(system.uptimeSeconds)}
				hint="Current process"
				icon={Clock}
			/>
			<StatCard
				title="Media stored"
				value={formatBytes(system.mediaBytes)}
				hint="Total bytes"
				icon={HardDrive}
			/>
			<StatCard
				title="Memory"
				value={formatBytes(system.memoryBytes)}
				hint="Resident set size"
				icon={MemoryStick}
			/>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Runtime</Card.Title>
					<Card.Description>Environment and provider configuration.</Card.Description>
				</Card.Header>
				<Card.Content>
					<dl class="grid gap-3 text-sm">
						<div class="flex items-center justify-between gap-3 border-b pb-2">
							<dt class="text-muted-foreground">Environment</dt>
							<dd class="font-medium">{system.nodeEnv}</dd>
						</div>
						<div class="flex items-center justify-between gap-3 border-b pb-2">
							<dt class="text-muted-foreground">Database provider</dt>
							<dd><code class="text-sm font-medium">{system.dbProvider}</code></dd>
						</div>
						<div class="flex items-center justify-between gap-3">
							<dt class="text-muted-foreground">Storage provider</dt>
							<dd><code class="text-sm font-medium">{system.storageProvider}</code></dd>
						</div>
					</dl>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Records</Card.Title>
					<Card.Description>Row counts across core tables.</Card.Description>
				</Card.Header>
				<Card.Content>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Table</Table.Head>
								<Table.Head class="text-right">Rows</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							<Table.Row>
								<Table.Cell>Users</Table.Cell>
								<Table.Cell class="text-right">{system.counts.users}</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>Products</Table.Cell>
								<Table.Cell class="text-right">{system.counts.products}</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>Orders</Table.Cell>
								<Table.Cell class="text-right">{system.counts.orders}</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>Media</Table.Cell>
								<Table.Cell class="text-right">{system.counts.media}</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>Audit entries</Table.Cell>
								<Table.Cell class="text-right">{system.counts.audit}</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>

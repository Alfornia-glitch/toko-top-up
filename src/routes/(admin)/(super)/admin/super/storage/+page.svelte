<script lang="ts">
	import { onMount } from 'svelte';
	import { FolderTree, HardDrive, Image as ImageIcon } from '@lucide/svelte';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Progress } from '#lib/frontend/components/ui/progress/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import StatCard from '#lib/frontend/components/admin/StatCard.svelte';

	type StorageFolder = { folder: string; assets: number; bytes: number };
	type StorageAsset = {
		id: string;
		url: string;
		path: string;
		folder: string;
		sizeBytes: number;
		createdAt: string;
	};
	type StorageStats = {
		assets: number;
		bytes: number;
		folders: StorageFolder[];
		recent: StorageAsset[];
	};

	let storage = $state<StorageStats | null>(null);
	let loading = $state(true);
	let error = $state('');

	const totalBytes = $derived(Math.max(1, storage?.bytes ?? 0));

	function formatBytes(bytes: number) {
		if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

		const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
		const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
		const value = bytes / 1024 ** exponent;

		return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
	}

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
			const response = await fetch('/api/admin/super/storage');
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load storage stats');

			storage = payload.data;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load storage stats';
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Storage</h1>
		<p class="text-sm text-muted-foreground">Media usage, folder breakdown and recent uploads.</p>
	</div>

	{#if error}
		<Card.Root>
			<Card.Content class="py-6 text-sm text-destructive">{error}</Card.Content>
		</Card.Root>
	{/if}

	{#if loading}
		<div class="grid gap-4 sm:grid-cols-3">
			{#each Array(3) as _, index (index)}
				<Skeleton class="h-28 w-full rounded-xl" />
			{/each}
		</div>
		<Skeleton class="h-64 w-full rounded-xl" />
	{:else if storage}
		<div class="grid gap-4 sm:grid-cols-3">
			<StatCard title="Assets" value={storage.assets} hint="Uploaded files" icon={ImageIcon} />
			<StatCard
				title="Total size"
				value={formatBytes(storage.bytes)}
				hint="All media"
				icon={HardDrive}
			/>
			<StatCard
				title="Folders"
				value={storage.folders.length}
				hint="Storage groups"
				icon={FolderTree}
			/>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Folder breakdown</Card.Title>
				<Card.Description>Storage usage grouped by folder.</Card.Description>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Folder</Table.Head>
							<Table.Head class="text-right">Assets</Table.Head>
							<Table.Head class="text-right">Size</Table.Head>
							<Table.Head class="w-1/3">Share</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if storage.folders.length === 0}
							<Table.Row>
								<Table.Cell colspan={4} class="h-24 text-center text-muted-foreground">
									No media stored yet.
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each storage.folders as folder (folder.folder)}
								{@const share = Math.round((folder.bytes / totalBytes) * 100)}
								<Table.Row>
									<Table.Cell>
										<Badge variant="secondary">{folder.folder}</Badge>
									</Table.Cell>
									<Table.Cell class="text-right">{folder.assets}</Table.Cell>
									<Table.Cell class="text-right">{formatBytes(folder.bytes)}</Table.Cell>
									<Table.Cell>
										<div class="flex items-center gap-2">
											<Progress value={share} class="h-2" />
											<span class="w-10 text-right text-xs text-muted-foreground">{share}%</span>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						{/if}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Recent uploads</Card.Title>
				<Card.Description>The latest files added to storage.</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if storage.recent.length === 0}
					<p class="py-6 text-center text-sm text-muted-foreground">No uploads yet.</p>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each storage.recent as asset (asset.id)}
							<div class="overflow-hidden rounded-lg border bg-card">
								<div class="aspect-[4/3] bg-muted">
									<img
										src={asset.url}
										alt={asset.path}
										class="size-full object-cover"
										loading="lazy"
									/>
								</div>
								<div class="space-y-1 p-3">
									<div class="flex items-center justify-between gap-2">
										<Badge variant="secondary">{asset.folder}</Badge>
										<span class="text-xs text-muted-foreground">{formatBytes(asset.sizeBytes)}</span
										>
									</div>
									<p class="truncate text-xs text-muted-foreground" title={asset.path}>
										{asset.path}
									</p>
									<p class="text-xs text-muted-foreground">{formatDate(asset.createdAt)}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>

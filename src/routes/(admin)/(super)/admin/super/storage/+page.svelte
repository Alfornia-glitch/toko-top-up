<script lang="ts">
	import { onMount } from 'svelte';
	import { FolderTree, HardDrive, Image as ImageIcon } from '@lucide/svelte';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Progress } from '#lib/frontend/components/ui/progress/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import StatCard from '#lib/frontend/components/admin/StatCard.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import {
		formatBytes,
		formatDateTime,
		formatNumber
	} from '#lib/frontend/modules/commerce/format.ts';

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

	onMount(() => {
		void load();
	});

	async function load() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/admin/super/storage');
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw payload;

			storage = payload.data;
		} catch (err) {
			error = errorMessage(err, 'admin_super_storage_load_failed');
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{m.admin_super_storage_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.admin_super_storage_subtitle()}</p>
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
			<StatCard
				title={m.admin_super_storage_assets()}
				value={storage.assets}
				hint={m.admin_super_storage_assets_hint()}
				icon={ImageIcon}
			/>
			<StatCard
				title={m.admin_super_storage_total_size()}
				value={formatBytes(storage.bytes)}
				hint={m.admin_super_storage_total_size_hint()}
				icon={HardDrive}
			/>
			<StatCard
				title={m.admin_super_storage_folders()}
				value={storage.folders.length}
				hint={m.admin_super_storage_folders_hint()}
				icon={FolderTree}
			/>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>{m.admin_super_storage_breakdown_title()}</Card.Title>
				<Card.Description>{m.admin_super_storage_breakdown_desc()}</Card.Description>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{m.admin_super_storage_col_folder()}</Table.Head>
							<Table.Head class="text-right">{m.admin_super_storage_col_assets()}</Table.Head>
							<Table.Head class="text-right">{m.admin_super_storage_col_size()}</Table.Head>
							<Table.Head class="w-1/3">{m.admin_super_storage_col_share()}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if storage.folders.length === 0}
							<Table.Row>
								<Table.Cell colspan={4} class="h-24 text-center text-muted-foreground">
									{m.admin_super_storage_no_media()}
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each storage.folders as folder (folder.folder)}
								{@const share = Math.round((folder.bytes / totalBytes) * 100)}
								<Table.Row>
									<Table.Cell>
										<Badge variant="secondary">{folder.folder}</Badge>
									</Table.Cell>
									<Table.Cell class="text-right">{formatNumber(folder.assets)}</Table.Cell>
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
				<Card.Title>{m.admin_super_storage_recent_title()}</Card.Title>
				<Card.Description>{m.admin_super_storage_recent_desc()}</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if storage.recent.length === 0}
					<p class="py-6 text-center text-sm text-muted-foreground">
						{m.admin_super_storage_no_uploads()}
					</p>
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
									<p class="text-xs text-muted-foreground">{formatDateTime(asset.createdAt)}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>

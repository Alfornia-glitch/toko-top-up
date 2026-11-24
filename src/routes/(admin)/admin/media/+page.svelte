<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		Check,
		Copy,
		FileImage,
		ImageIcon,
		LayoutGrid,
		List,
		LoaderCircle,
		Search,
		Trash2,
		Upload
	} from '@lucide/svelte';
	import ConfirmDialog from '#lib/frontend/components/admin/ConfirmDialog.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Dialog from '#lib/frontend/components/ui/dialog/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import * as Tabs from '#lib/frontend/components/ui/tabs/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { compressImage } from '#lib/frontend/modules/shared/image.ts';

	type MediaAsset = {
		id: string;
		path: string;
		url: string;
		contentType: string;
		sizeBytes: number;
		folder: string;
		alt: string | null;
		uploadedBy: string | null;
		createdAt: string;
	};

	const folders = [
		'products',
		'categories',
		'brands',
		'banners',
		'testimonials',
		'avatars',
		'reviews',
		'returns',
		'support',
		'media'
	];

	const pageSize = 24;

	let assets = $state<MediaAsset[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let folder = $state('all');
	let view = $state('grid');
	let page = $state(1);
	let total = $state(0);

	let uploadOpen = $state(false);
	let uploadFolder = $state('products');
	let fileInput = $state<HTMLInputElement | null>(null);
	let uploading = $state(false);
	let uploadError = $state('');

	let deleteOpen = $state(false);
	let deleteTarget = $state<MediaAsset | null>(null);
	let copiedId = $state('');
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));
	const from = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
	const to = $derived(Math.min(page * pageSize, total));

	onMount(() => {
		void loadMedia();
	});

	onDestroy(() => {
		if (copyTimer) clearTimeout(copyTimer);
	});

	async function loadMedia() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: String(pageSize)
			});
			const term = search.trim();

			if (term) params.set('q', term);
			if (folder !== 'all') params.set('folder', folder);

			const response = await fetch(`/api/admin/media?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load media');

			assets = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load media';
		} finally {
			loading = false;
		}
	}

	function handleSearch(event: SubmitEvent) {
		event.preventDefault();
		page = 1;
		void loadMedia();
	}

	function handleFolderChange(value: string) {
		folder = value;
		page = 1;
		void loadMedia();
	}

	function handlePageChange(nextPage: number) {
		if (nextPage < 1 || nextPage > totalPages) return;
		page = nextPage;
		void loadMedia();
	}

	function openUpload() {
		uploadError = '';
		uploadFolder = folder === 'all' ? 'products' : folder;
		uploadOpen = true;
	}

	async function handleUpload() {
		const file = fileInput?.files?.[0];

		if (!file) {
			uploadError = 'Choose an image to upload';
			return;
		}

		uploading = true;
		uploadError = '';

		try {
			const body = new FormData();
			body.append('file', await compressImage(file));
			body.append('folder', uploadFolder);

			const response = await fetch('/api/upload', { method: 'POST', body });
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Upload failed');

			uploadOpen = false;
			if (fileInput) fileInput.value = '';
			page = 1;
			await loadMedia();
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	function openDelete(asset: MediaAsset) {
		deleteTarget = asset;
		deleteOpen = true;
	}

	async function deleteAsset() {
		if (!deleteTarget) return;

		error = '';

		try {
			const response = await fetch(`/api/admin/media/${deleteTarget.id}`, { method: 'DELETE' });
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not delete media');

			if (assets.length === 1 && page > 1) page -= 1;
			await loadMedia();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not delete media';
		} finally {
			deleteTarget = null;
		}
	}

	async function copyUrl(asset: MediaAsset) {
		try {
			await navigator.clipboard.writeText(asset.url);
			copiedId = asset.id;
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => {
				copiedId = '';
			}, 1500);
		} catch {
			error = 'Could not copy the URL to the clipboard';
		}
	}

	function formatSize(bytes: number) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	const dateFormatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});

	function formatDate(value: string) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';

		return dateFormatter.format(date);
	}
</script>

{#snippet assetActions(asset: MediaAsset)}
	<div class="flex items-center gap-1">
		<Button
			variant="ghost"
			size="icon-sm"
			aria-label={copiedId === asset.id ? 'URL copied' : 'Copy URL'}
			onclick={() => void copyUrl(asset)}
		>
			{#if copiedId === asset.id}
				<Check class="size-4 text-emerald-600" />
			{:else}
				<Copy class="size-4" />
			{/if}
		</Button>
		<Button
			variant="ghost"
			size="icon-sm"
			class="text-destructive hover:bg-destructive/10"
			aria-label="Delete media"
			onclick={() => openDelete(asset)}
		>
			<Trash2 class="size-4" />
		</Button>
	</div>
{/snippet}

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Media</h1>
			<p class="text-sm text-muted-foreground">
				Browse the public media library and upload new images.
			</p>
		</div>
		<Button onclick={openUpload}>
			<Upload class="size-4" />
			Upload image
		</Button>
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
		<Card.Content class="py-4">
			<form class="flex flex-wrap items-end gap-3" onsubmit={handleSearch}>
				<div class="min-w-56 flex-1 space-y-1.5">
					<Label for="media-search">Search</Label>
					<div class="relative">
						<Search
							class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							id="media-search"
							bind:value={search}
							placeholder="Search path or alt text"
							class="pl-8"
						/>
					</div>
				</div>

				<div class="w-44 space-y-1.5">
					<Label for="media-folder-filter">Folder</Label>
					<Select.Root type="single" value={folder} onValueChange={handleFolderChange}>
						<Select.Trigger id="media-folder-filter" class="w-full">
							<Select.Value placeholder="All folders" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all" label="All folders">All folders</Select.Item>
							{#each folders as item (item)}
								<Select.Item value={item} label={item}>{item}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<Button type="submit" variant="outline">
					<Search class="size-4" />
					Search
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Tabs.Root bind:value={view}>
		<Tabs.List>
			<Tabs.Trigger value="grid">
				<LayoutGrid class="size-4" />
				Grid
			</Tabs.Trigger>
			<Tabs.Trigger value="list">
				<List class="size-4" />
				List
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="grid" class="mt-3">
			{#if loading}
				<div class="flex h-64 items-center justify-center text-muted-foreground">
					<LoaderCircle class="size-5 animate-spin" />
				</div>
			{:else if assets.length === 0}
				<div
					class="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-muted-foreground"
				>
					<ImageIcon class="size-8" />
					<p class="text-sm">No media matches the current filters.</p>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					{#each assets as asset (asset.id)}
						<div class="overflow-hidden rounded-lg border bg-card">
							<img
								src={asset.url}
								alt={asset.alt ?? asset.path}
								class="aspect-square w-full bg-muted object-cover"
								loading="lazy"
							/>
							<div class="space-y-2 p-3">
								<div class="min-w-0">
									<p class="truncate font-medium" title={asset.path}>{asset.path}</p>
									<p class="text-xs text-muted-foreground">
										{formatSize(asset.sizeBytes)} · {formatDate(asset.createdAt)}
									</p>
								</div>
								<div class="flex items-center justify-between gap-2">
									<Badge variant="secondary" class="capitalize">{asset.folder}</Badge>
									{@render assetActions(asset)}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="list" class="mt-3">
			{#if loading}
				<div
					class="flex h-64 items-center justify-center rounded-lg border bg-card text-muted-foreground"
				>
					<LoaderCircle class="size-5 animate-spin" />
				</div>
			{:else if assets.length === 0}
				<div
					class="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-muted-foreground"
				>
					<ImageIcon class="size-8" />
					<p class="text-sm">No media matches the current filters.</p>
				</div>
			{:else}
				<div class="divide-y overflow-hidden rounded-lg border bg-card">
					{#each assets as asset (asset.id)}
						<div class="flex items-center gap-3 p-3">
							<img
								src={asset.url}
								alt={asset.alt ?? asset.path}
								class="size-12 shrink-0 rounded-md border bg-muted object-cover"
								loading="lazy"
							/>
							<div class="min-w-0 flex-1">
								<p class="truncate font-medium" title={asset.path}>{asset.path}</p>
								<p class="text-xs text-muted-foreground">
									{formatSize(asset.sizeBytes)} · {formatDate(asset.createdAt)} · {asset.contentType}
								</p>
							</div>
							<Badge variant="secondary" class="hidden capitalize sm:inline-flex"
								>{asset.folder}</Badge
							>
							{@render assetActions(asset)}
						</div>
					{/each}
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>

	<div class="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
		<span>{from}–{to} of {total}</span>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				disabled={page <= 1 || loading}
				onclick={() => handlePageChange(page - 1)}
			>
				Previous
			</Button>
			<span>Page {page} of {totalPages}</span>
			<Button
				variant="outline"
				size="sm"
				disabled={page >= totalPages || loading}
				onclick={() => handlePageChange(page + 1)}
			>
				Next
			</Button>
		</div>
	</div>
</div>

<Dialog.Root bind:open={uploadOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Upload image</Dialog.Title>
			<Dialog.Description>
				JPEG, PNG, WebP, AVIF or GIF up to 5 MiB. The file is stored in the selected folder.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-3 py-2">
			<div class="space-y-1.5">
				<Label for="upload-folder">Folder</Label>
				<Select.Root
					type="single"
					value={uploadFolder}
					onValueChange={(value) => (uploadFolder = value)}
				>
					<Select.Trigger id="upload-folder" class="w-full">
						<Select.Value placeholder="Select a folder" />
					</Select.Trigger>
					<Select.Content>
						{#each folders as item (item)}
							<Select.Item value={item} label={item}>{item}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-1.5">
				<Label for="upload-file">Image</Label>
				<Input
					id="upload-file"
					bind:ref={fileInput}
					type="file"
					accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
				/>
			</div>

			{#if uploadError}
				<p class="text-sm text-destructive" role="alert">{uploadError}</p>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (uploadOpen = false)}>Cancel</Button>
			<Button onclick={handleUpload} disabled={uploading}>
				{#if uploading}
					<LoaderCircle class="size-4 animate-spin" />
					Uploading…
				{:else}
					<FileImage class="size-4" />
					Upload
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={deleteOpen}
	title="Delete media"
	description={`Delete “${deleteTarget?.path ?? 'this file'}”? It will be removed from storage and cannot be restored.`}
	confirmLabel="Delete"
	destructive
	onConfirm={deleteAsset}
/>

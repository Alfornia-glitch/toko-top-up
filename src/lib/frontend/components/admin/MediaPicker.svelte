<script lang="ts">
	import { ImagePlus, LoaderCircle, Upload } from '@lucide/svelte';
	import * as Dialog from '#lib/frontend/components/ui/dialog/index.ts';
	import * as Tabs from '#lib/frontend/components/ui/tabs/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { cn } from '#lib/frontend/utils.ts';
	import { compressImage } from '#lib/frontend/modules/shared/image.ts';

	export type MediaAsset = {
		id: string;
		path: string;
		url: string;
		contentType: string;
		sizeBytes: number;
		folder: string;
		alt?: string | null;
	};

	let {
		open = $bindable(false),
		folder = 'products',
		onSelect
	}: {
		open?: boolean;
		folder?: string;
		onSelect?: (asset: MediaAsset) => void;
	} = $props();

	let assets = $state<MediaAsset[]>([]);
	let loading = $state(false);
	let uploading = $state(false);
	let error = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (open) void loadAssets();
	});

	async function loadAssets() {
		loading = true;
		error = '';

		try {
			const response = await fetch(
				`/api/admin/media?folder=${encodeURIComponent(folder)}&pageSize=60`
			);
			const payload = await response.json();

			if (!response.ok) throw new Error(payload.error ?? 'Could not load media');
			assets = payload.data ?? [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load media';
		} finally {
			loading = false;
		}
	}

	async function handleUpload() {
		const file = fileInput?.files?.[0];
		if (!file) return;

		uploading = true;
		error = '';

		try {
			const body = new FormData();
			body.append('file', await compressImage(file));
			body.append('folder', folder);

			const response = await fetch('/api/upload', { method: 'POST', body });
			const payload = await response.json();

			if (!response.ok) throw new Error(payload.error ?? 'Upload failed');

			assets = [payload as MediaAsset, ...assets];
			select(payload as MediaAsset);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	function select(asset: MediaAsset) {
		onSelect?.(asset);
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Media library</Dialog.Title>
			<Dialog.Description>
				Pick an existing image or upload a new one to the public bucket.
			</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root value="library">
			<Tabs.List>
				<Tabs.Trigger value="library">Library</Tabs.Trigger>
				<Tabs.Trigger value="upload">Upload</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="library" class="mt-3">
				{#if error}
					<p class="mb-3 text-sm text-destructive">{error}</p>
				{/if}

				{#if loading}
					<div class="flex h-48 items-center justify-center text-muted-foreground">
						<LoaderCircle class="size-5 animate-spin" />
					</div>
				{:else if assets.length === 0}
					<div class="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
						<ImagePlus class="size-8" />
						<p class="text-sm">No media in this folder yet.</p>
					</div>
				{:else}
					<div class="grid max-h-96 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
						{#each assets as asset (asset.id)}
							<button
								type="button"
								class={cn(
									'group overflow-hidden rounded-lg border bg-muted text-left transition hover:ring-2 hover:ring-ring'
								)}
								onclick={() => select(asset)}
							>
								<img
									src={asset.url}
									alt={asset.alt ?? asset.path}
									class="aspect-square w-full object-cover"
									loading="lazy"
								/>
							</button>
						{/each}
					</div>
				{/if}
			</Tabs.Content>

			<Tabs.Content value="upload" class="mt-3 space-y-3">
				<Input bind:ref={fileInput} type="file" accept="image/*" />
				<p class="text-xs text-muted-foreground">JPEG, PNG, WebP, AVIF or GIF. Maximum 5 MiB.</p>
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
				<Button onclick={handleUpload} disabled={uploading}>
					<Upload class="size-4" />
					{uploading ? 'Uploading…' : 'Upload image'}
				</Button>
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>

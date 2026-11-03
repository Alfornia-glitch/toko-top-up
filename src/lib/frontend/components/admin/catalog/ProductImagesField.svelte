<script lang="ts" module>
	export type ProductImageRow = {
		clientId: string;
		id?: string;
		url: string;
		path: string | null;
		alt: string;
		position: number;
	};
</script>

<script lang="ts">
	import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from '@lucide/svelte';
	import MediaPicker from '#lib/frontend/components/admin/MediaPicker.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';

	let { images = $bindable() }: { images: ProductImageRow[] } = $props();

	let pickerOpen = $state(false);

	function addImage(asset: { url: string; path?: string | null; alt?: string | null }) {
		images.push({
			clientId: crypto.randomUUID(),
			url: asset.url,
			path: asset.path ?? null,
			alt: asset.alt ?? '',
			position: images.length
		});
	}

	function move(index: number, offset: number) {
		const target = index + offset;
		if (target < 0 || target >= images.length) return;

		const [row] = images.splice(index, 1);
		images.splice(target, 0, row);

		images.forEach((image, position) => {
			image.position = position;
		});
	}

	function remove(index: number) {
		images.splice(index, 1);

		images.forEach((image, position) => {
			image.position = position;
		});
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div>
			<h3 class="font-medium">Images</h3>
			<p class="text-sm text-muted-foreground">The first image is used as the catalog thumbnail.</p>
		</div>
		<Button type="button" variant="outline" onclick={() => (pickerOpen = true)}>
			<ImagePlus class="size-4" />
			Add image
		</Button>
	</div>

	{#if images.length === 0}
		<div class="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
			No images yet. Add one from the media library.
		</div>
	{:else}
		<div class="space-y-3">
			{#each images as image, index (image.clientId)}
				<div class="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start">
					<img
						src={image.url}
						alt={image.alt || 'Product image'}
						class="size-20 shrink-0 rounded-md border bg-muted object-cover"
						loading="lazy"
					/>

					<div class="min-w-0 flex-1 space-y-2">
						<Input bind:value={image.alt} placeholder="Alt text" aria-label="Image alt text" />
						<p class="truncate text-xs text-muted-foreground">{image.url}</p>
					</div>

					<div class="flex gap-1 sm:flex-col">
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							disabled={index === 0}
							aria-label="Move image up"
							onclick={() => move(index, -1)}
						>
							<ArrowUp class="size-4" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							disabled={index === images.length - 1}
							aria-label="Move image down"
							onclick={() => move(index, 1)}
						>
							<ArrowDown class="size-4" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							class="text-destructive hover:bg-destructive/10"
							aria-label="Remove image"
							onclick={() => remove(index)}
						>
							<Trash2 class="size-4" />
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<MediaPicker bind:open={pickerOpen} folder="products" onSelect={addImage} />

<script lang="ts" module>
	export type CategoryRecord = {
		id: string;
		name: string;
		slug: string;
		parentId: string | null;
		parentName: string | null;
		description: string | null;
		imageUrl: string | null;
		position: number;
		status: string;
		updatedAt: string;
		productCount: number;
	};

	export type CategoryOption = {
		id: string;
		name: string;
		parentId: string | null;
	};
</script>

<script lang="ts">
	import { Image as ImageIcon } from '@lucide/svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import * as Dialog from '#lib/frontend/components/ui/dialog/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';
	import MediaPicker from '#lib/frontend/components/admin/MediaPicker.svelte';

	let {
		open = $bindable(false),
		category = null,
		categories = [],
		onsaved
	}: {
		open?: boolean;
		category?: CategoryRecord | null;
		categories?: CategoryOption[];
		onsaved?: () => void | Promise<void>;
	} = $props();

	function initialForm() {
		const value = category;

		return {
			name: value?.name ?? '',
			slug: value?.slug ?? '',
			parentId: value?.parentId ?? 'none',
			description: value?.description ?? '',
			imageUrl: value?.imageUrl ?? '',
			position: String(value?.position ?? 0),
			status: value?.status ?? 'active'
		};
	}

	const initial = initialForm();
	let name = $state(initial.name);
	let slug = $state(initial.slug);
	let parentId = $state(initial.parentId);
	let description = $state(initial.description);
	let imageUrl = $state(initial.imageUrl);
	let position = $state(initial.position);
	let status = $state(initial.status);
	let mediaOpen = $state(false);
	let saving = $state(false);
	let error = $state('');

	const blockedIds = $derived.by(() => {
		const ids = new SvelteSet<string>();
		if (!category) return ids;

		ids.add(category.id);
		let changed = true;

		while (changed) {
			changed = false;

			for (const option of categories) {
				if (option.parentId && ids.has(option.parentId) && !ids.has(option.id)) {
					ids.add(option.id);
					changed = true;
				}
			}
		}

		return ids;
	});

	const parentOptions = $derived(categories.filter((option) => !blockedIds.has(option.id)));

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';

		const trimmedName = name.trim();
		if (!trimmedName) {
			error = 'Name is required.';
			return;
		}

		saving = true;

		try {
			const trimmedSlug = slug.trim();
			const body = {
				name: trimmedName,
				...(trimmedSlug ? { slug: trimmedSlug } : {}),
				parentId: parentId === 'none' ? null : parentId,
				description: description.trim() ? description.trim() : null,
				imageUrl: imageUrl.trim() ? imageUrl.trim() : null,
				position: Math.max(0, Math.trunc(Number(position) || 0)),
				status
			};
			const endpoint = category ? `/api/admin/categories/${category.id}` : '/api/admin/categories';
			const response = await fetch(endpoint, {
				method: category ? 'PATCH' : 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not save category');

			open = false;
			await onsaved?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save category';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{category ? 'Edit category' : 'New category'}</Dialog.Title>
			<Dialog.Description>
				{category
					? 'Update the category details, image and hierarchy.'
					: 'Add a category to organise the catalog.'}
			</Dialog.Description>
		</Dialog.Header>

		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				<Field.Field>
					<Field.Label for="category-name">Name</Field.Label>
					<Input id="category-name" bind:value={name} placeholder="e.g. Audio" required />
				</Field.Field>

				<Field.Field>
					<Field.Label for="category-slug">Slug</Field.Label>
					<Input id="category-slug" bind:value={slug} placeholder="auto-generated when empty" />
					<Field.Description>Leave empty to generate from the name.</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="category-parent">Parent category</Field.Label>
					<Select.Root type="single" bind:value={parentId}>
						<Select.Trigger id="category-parent" class="w-full">
							<Select.Value placeholder="No parent" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="none" label="No parent">No parent</Select.Item>
							{#each parentOptions as option (option.id)}
								<Select.Item value={option.id} label={option.name}>{option.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</Field.Field>

				<Field.Field>
					<Field.Label for="category-image">Image</Field.Label>
					<div class="flex items-center gap-3">
						{#if imageUrl}
							<img
								src={imageUrl}
								alt="Category preview"
								class="size-14 rounded-full border bg-muted object-cover"
							/>
						{:else}
							<div
								class="flex size-14 items-center justify-center rounded-full border bg-muted text-muted-foreground"
							>
								<ImageIcon class="size-5" />
							</div>
						{/if}
						<div class="flex flex-wrap items-center gap-2">
							<Button
								id="category-image"
								type="button"
								variant="outline"
								size="sm"
								onclick={() => (mediaOpen = true)}
							>
								{imageUrl ? 'Change image' : 'Choose image'}
							</Button>
							{#if imageUrl}
								<Button type="button" variant="ghost" size="sm" onclick={() => (imageUrl = '')}>
									Remove
								</Button>
							{/if}
						</div>
					</div>
					<Field.Description>
						Shown on the storefront category carousel. Pick or upload an image.
					</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="category-description">Description</Field.Label>
					<Textarea
						id="category-description"
						bind:value={description}
						placeholder="Optional description"
						rows={3}
					/>
				</Field.Field>

				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="category-position">Position</Field.Label>
						<Input id="category-position" type="number" min="0" step="1" bind:value={position} />
					</Field.Field>

					<Field.Field>
						<Field.Label for="category-status">Status</Field.Label>
						<Select.Root type="single" bind:value={status}>
							<Select.Trigger id="category-status" class="w-full">
								<Select.Value placeholder="Select status" />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="active" label="Active">Active</Select.Item>
								<Select.Item value="inactive" label="Inactive">Inactive</Select.Item>
							</Select.Content>
						</Select.Root>
					</Field.Field>
				</div>
			</Field.Group>

			{#if error}
				<Field.Error>{error}</Field.Error>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={saving}>
					Cancel
				</Button>
				<Button type="submit" disabled={saving}>
					{saving ? 'Saving…' : category ? 'Save changes' : 'Create category'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<MediaPicker
	bind:open={mediaOpen}
	folder="categories"
	onSelect={(asset) => (imageUrl = asset.url)}
/>

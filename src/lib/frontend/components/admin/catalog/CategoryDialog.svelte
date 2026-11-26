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
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { m } from '#lib/paraglide/messages.js';
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
			error = m.components_form_name_required();
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

			if (!response.ok) throw payload;

			open = false;
			await onsaved?.();
		} catch (err) {
			error = errorMessage(err, 'components_category_dialog_save_failed');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title
				>{category
					? m.components_category_dialog_edit_title()
					: m.components_category_dialog_new_title()}</Dialog.Title
			>
			<Dialog.Description>
				{category
					? m.components_category_dialog_edit_description()
					: m.components_category_dialog_new_description()}
			</Dialog.Description>
		</Dialog.Header>

		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				<Field.Field>
					<Field.Label for="category-name">{m.common_name()}</Field.Label>
					<Input
						id="category-name"
						bind:value={name}
						placeholder={m.components_category_dialog_name_placeholder()}
						required
					/>
				</Field.Field>

				<Field.Field>
					<Field.Label for="category-slug">{m.components_form_slug()}</Field.Label>
					<Input
						id="category-slug"
						bind:value={slug}
						placeholder={m.components_form_slug_placeholder()}
					/>
					<Field.Description>{m.components_form_slug_hint()}</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="category-parent">{m.components_category_dialog_parent()}</Field.Label>
					<Select.Root type="single" bind:value={parentId}>
						<Select.Trigger id="category-parent" class="w-full">
							<Select.Value placeholder={m.components_category_dialog_no_parent()} />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="none" label={m.components_category_dialog_no_parent()}
								>{m.components_category_dialog_no_parent()}</Select.Item
							>
							{#each parentOptions as option (option.id)}
								<Select.Item value={option.id} label={option.name}>{option.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</Field.Field>

				<Field.Field>
					<Field.Label for="category-image">{m.components_form_image()}</Field.Label>
					<div class="flex items-center gap-3">
						{#if imageUrl}
							<img
								src={imageUrl}
								alt={m.components_category_dialog_preview()}
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
								{imageUrl
									? m.components_category_dialog_change_image()
									: m.components_form_choose_image()}
							</Button>
							{#if imageUrl}
								<Button type="button" variant="ghost" size="sm" onclick={() => (imageUrl = '')}>
									{m.common_remove()}
								</Button>
							{/if}
						</div>
					</div>
					<Field.Description>
						{m.components_category_dialog_image_hint()}
					</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="category-description">{m.common_description()}</Field.Label>
					<Textarea
						id="category-description"
						bind:value={description}
						placeholder={m.components_form_optional_description()}
						rows={3}
					/>
				</Field.Field>

				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="category-position">{m.components_form_position()}</Field.Label>
						<Input id="category-position" type="number" min="0" step="1" bind:value={position} />
					</Field.Field>

					<Field.Field>
						<Field.Label for="category-status">{m.common_status()}</Field.Label>
						<Select.Root type="single" bind:value={status}>
							<Select.Trigger id="category-status" class="w-full">
								<Select.Value placeholder={m.components_form_select_status()} />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="active" label={m.common_active()}
									>{m.common_active()}</Select.Item
								>
								<Select.Item value="inactive" label={m.common_inactive()}
									>{m.common_inactive()}</Select.Item
								>
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
					{m.common_cancel()}
				</Button>
				<Button type="submit" disabled={saving}>
					{saving
						? m.common_saving()
						: category
							? m.common_save_changes()
							: m.components_category_dialog_create()}
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

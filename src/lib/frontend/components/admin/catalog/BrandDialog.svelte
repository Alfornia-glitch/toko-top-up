<script lang="ts" module>
	export type BrandRecord = {
		id: string;
		name: string;
		slug: string;
		logoUrl: string | null;
		description: string | null;
		status: string;
		updatedAt: string;
		productCount: number;
	};
</script>

<script lang="ts">
	import { Image as ImageIcon } from '@lucide/svelte';
	import * as Dialog from '#lib/frontend/components/ui/dialog/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';
	import MediaPicker from '#lib/frontend/components/admin/MediaPicker.svelte';

	let {
		open = $bindable(false),
		brand = null,
		onsaved
	}: {
		open?: boolean;
		brand?: BrandRecord | null;
		onsaved?: () => void | Promise<void>;
	} = $props();

	function initialForm() {
		const value = brand;

		return {
			name: value?.name ?? '',
			slug: value?.slug ?? '',
			logoUrl: value?.logoUrl ?? '',
			description: value?.description ?? '',
			status: value?.status ?? 'active'
		};
	}

	const initial = initialForm();
	let name = $state(initial.name);
	let slug = $state(initial.slug);
	let logoUrl = $state(initial.logoUrl);
	let description = $state(initial.description);
	let status = $state(initial.status);
	let mediaOpen = $state(false);
	let saving = $state(false);
	let error = $state('');

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
				logoUrl: logoUrl.trim() ? logoUrl.trim() : null,
				description: description.trim() ? description.trim() : null,
				status
			};
			const endpoint = brand ? `/api/admin/brands/${brand.id}` : '/api/admin/brands';
			const response = await fetch(endpoint, {
				method: brand ? 'PATCH' : 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not save brand');

			open = false;
			await onsaved?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save brand';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{brand ? 'Edit brand' : 'New brand'}</Dialog.Title>
			<Dialog.Description>
				{brand ? 'Update the brand details and logo.' : 'Add a brand to the catalog.'}
			</Dialog.Description>
		</Dialog.Header>

		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				<Field.Field>
					<Field.Label for="brand-name">Name</Field.Label>
					<Input id="brand-name" bind:value={name} placeholder="e.g. Acme" required />
				</Field.Field>

				<Field.Field>
					<Field.Label for="brand-slug">Slug</Field.Label>
					<Input id="brand-slug" bind:value={slug} placeholder="auto-generated when empty" />
					<Field.Description>Leave empty to generate from the name.</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="brand-logo">Logo</Field.Label>
					<div class="flex items-center gap-3">
						{#if logoUrl}
							<img
								src={logoUrl}
								alt="Brand logo preview"
								class="size-14 rounded-lg border bg-muted object-contain p-1"
							/>
						{:else}
							<div
								class="flex size-14 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
							>
								<ImageIcon class="size-5" />
							</div>
						{/if}
						<div class="flex flex-wrap items-center gap-2">
							<Button type="button" variant="outline" size="sm" onclick={() => (mediaOpen = true)}>
								Choose logo
							</Button>
							{#if logoUrl}
								<Button type="button" variant="ghost" size="sm" onclick={() => (logoUrl = '')}>
									Remove
								</Button>
							{/if}
						</div>
					</div>
					<Field.Description>Pick an image from the media library.</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="brand-description">Description</Field.Label>
					<Textarea
						id="brand-description"
						bind:value={description}
						placeholder="Optional description"
						rows={3}
					/>
				</Field.Field>

				<Field.Field>
					<Field.Label for="brand-status">Status</Field.Label>
					<Select.Root type="single" bind:value={status}>
						<Select.Trigger id="brand-status" class="w-full">
							<Select.Value placeholder="Select status" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="active" label="Active">Active</Select.Item>
							<Select.Item value="inactive" label="Inactive">Inactive</Select.Item>
						</Select.Content>
					</Select.Root>
				</Field.Field>
			</Field.Group>

			{#if error}
				<Field.Error>{error}</Field.Error>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={saving}>
					Cancel
				</Button>
				<Button type="submit" disabled={saving}>
					{saving ? 'Saving…' : brand ? 'Save changes' : 'Create brand'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<MediaPicker bind:open={mediaOpen} folder="brands" onSelect={(asset) => (logoUrl = asset.url)} />

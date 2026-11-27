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
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { m } from '#lib/paraglide/messages.js';
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
			error = m.components_form_name_required();
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

			if (!response.ok) throw payload;

			open = false;
			await onsaved?.();
		} catch (err) {
			error = errorMessage(err, 'components_brand_dialog_save_failed');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title
				>{brand
					? m.components_brand_dialog_edit_title()
					: m.components_brand_dialog_new_title()}</Dialog.Title
			>
			<Dialog.Description>
				{brand
					? m.components_brand_dialog_edit_description()
					: m.components_brand_dialog_new_description()}
			</Dialog.Description>
		</Dialog.Header>

		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				<Field.Field>
					<Field.Label for="brand-name">{m.common_name()}</Field.Label>
					<Input
						id="brand-name"
						bind:value={name}
						placeholder={m.components_brand_dialog_name_placeholder()}
						required
					/>
				</Field.Field>

				<Field.Field>
					<Field.Label for="brand-slug">{m.components_form_slug()}</Field.Label>
					<Input
						id="brand-slug"
						bind:value={slug}
						placeholder={m.components_form_slug_placeholder()}
					/>
					<Field.Description>{m.components_form_slug_hint()}</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="brand-logo">{m.components_brand_dialog_logo()}</Field.Label>
					<div class="flex items-center gap-3">
						{#if logoUrl}
							<img
								src={logoUrl}
								alt={m.components_brand_dialog_logo_preview()}
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
								{m.components_brand_dialog_choose_logo()}
							</Button>
							{#if logoUrl}
								<Button type="button" variant="ghost" size="sm" onclick={() => (logoUrl = '')}>
									{m.common_remove()}
								</Button>
							{/if}
						</div>
					</div>
					<Field.Description>{m.components_brand_dialog_logo_hint()}</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="brand-description">{m.common_description()}</Field.Label>
					<Textarea
						id="brand-description"
						bind:value={description}
						placeholder={m.components_form_optional_description()}
						rows={3}
					/>
				</Field.Field>

				<Field.Field>
					<Field.Label for="brand-status">{m.common_status()}</Field.Label>
					<Select.Root type="single" bind:value={status}>
						<Select.Trigger id="brand-status" class="w-full">
							<Select.Value placeholder={m.components_form_select_status()} />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="active" label={m.common_active()}>{m.common_active()}</Select.Item
							>
							<Select.Item value="inactive" label={m.common_inactive()}
								>{m.common_inactive()}</Select.Item
							>
						</Select.Content>
					</Select.Root>
				</Field.Field>
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
						: brand
							? m.common_save_changes()
							: m.components_brand_dialog_create()}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<MediaPicker bind:open={mediaOpen} folder="brands" onSelect={(asset) => (logoUrl = asset.url)} />

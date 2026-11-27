<script lang="ts" module>
	export type ContentKind = 'banners' | 'announcements' | 'testimonials';
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
	import { Switch } from '#lib/frontend/components/ui/switch/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';
	import MediaPicker from '#lib/frontend/components/admin/MediaPicker.svelte';

	let {
		open = $bindable(false),
		kind,
		item = null,
		onsaved
	}: {
		open?: boolean;
		kind: ContentKind;
		item?: Record<string, unknown> | null;
		onsaved?: () => void | Promise<void>;
	} = $props();

	function str(value: unknown) {
		return value === null || value === undefined ? '' : String(value);
	}

	function toDatetimeLocal(value: unknown) {
		if (!value) return '';
		const date = new Date(String(value));
		if (Number.isNaN(date.getTime())) return '';

		const pad = (input: number) => String(input).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	function fromDatetimeLocal(value: string) {
		return value ? new Date(value).toISOString() : null;
	}

	type FormState = {
		key: string;
		title: string;
		subtitle: string;
		imageUrl: string;
		mobileImageUrl: string;
		ctaLabel: string;
		ctaUrl: string;
		text: string;
		link: string;
		caption: string;
		position: string;
		active: boolean;
		startsAt: string;
		endsAt: string;
	};

	function initialForm(): FormState {
		const value = item;

		return {
			key: str(value?.key) || 'hero',
			title: str(value?.title),
			subtitle: str(value?.subtitle),
			imageUrl: str(value?.imageUrl),
			mobileImageUrl: str(value?.mobileImageUrl),
			ctaLabel: str(value?.ctaLabel),
			ctaUrl: str(value?.ctaUrl),
			text: str(value?.text),
			link: str(value?.link),
			caption: str(value?.caption),
			position: str(value?.position) || '0',
			active: value?.active === undefined || value?.active === null ? true : Boolean(value.active),
			startsAt: toDatetimeLocal(value?.startsAt),
			endsAt: toDatetimeLocal(value?.endsAt)
		};
	}

	let form = $state<FormState>(initialForm());
	let mediaOpen = $state(false);
	let mediaTarget = $state<'primary' | 'mobile'>('primary');
	let saving = $state(false);
	let error = $state('');

	const mediaFolder = $derived(kind === 'testimonials' ? 'testimonials' : 'banners');
	const title = $derived(
		item
			? kind === 'banners'
				? m.components_content_dialog_edit_banner()
				: kind === 'announcements'
					? m.components_content_dialog_edit_announcement()
					: m.components_content_dialog_edit_testimonial()
			: kind === 'banners'
				? m.components_content_dialog_new_banner()
				: kind === 'announcements'
					? m.components_content_dialog_new_announcement()
					: m.components_content_dialog_new_testimonial()
	);

	function chooseMedia(target: 'primary' | 'mobile') {
		mediaTarget = target;
		mediaOpen = true;
	}

	function handleSelect(asset: { url: string }) {
		if (mediaTarget === 'mobile') {
			form.mobileImageUrl = asset.url;
			return;
		}

		form.imageUrl = asset.url;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';

		const numericPosition = Number(form.position);
		if (!Number.isInteger(numericPosition) || numericPosition < 0) {
			error = m.components_content_dialog_position_invalid();
			return;
		}

		let payload: Record<string, unknown>;

		if (kind === 'banners') {
			if (!form.title.trim() || !form.imageUrl.trim()) {
				error = m.components_content_dialog_title_image_required();
				return;
			}

			payload = {
				key: form.key,
				title: form.title.trim(),
				subtitle: form.subtitle.trim() || null,
				imageUrl: form.imageUrl.trim(),
				mobileImageUrl: form.mobileImageUrl.trim() || null,
				ctaLabel: form.ctaLabel.trim() || null,
				ctaUrl: form.ctaUrl.trim() || null,
				position: numericPosition,
				active: form.active,
				startsAt: fromDatetimeLocal(form.startsAt),
				endsAt: fromDatetimeLocal(form.endsAt)
			};
		} else if (kind === 'announcements') {
			if (!form.text.trim()) {
				error = m.components_content_dialog_text_required();
				return;
			}

			payload = {
				text: form.text.trim(),
				link: form.link.trim() || null,
				position: numericPosition,
				active: form.active,
				startsAt: fromDatetimeLocal(form.startsAt),
				endsAt: fromDatetimeLocal(form.endsAt)
			};
		} else {
			if (!form.imageUrl.trim()) {
				error = m.components_content_dialog_image_required();
				return;
			}

			payload = {
				imageUrl: form.imageUrl.trim(),
				caption: form.caption.trim() || null,
				link: form.link.trim() || null,
				position: numericPosition,
				active: form.active
			};
		}

		saving = true;

		try {
			const endpoint = item
				? `/api/admin/content/${kind}/${String(item.id)}`
				: `/api/admin/content/${kind}`;
			const response = await fetch(endpoint, {
				method: item ? 'PATCH' : 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const result = await response.json().catch(() => ({}));

			if (!response.ok) throw result;

			open = false;
			await onsaved?.();
		} catch (err) {
			error = errorMessage(err, 'components_content_dialog_save_failed');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>
				{kind === 'banners'
					? m.components_content_dialog_banner_description()
					: kind === 'announcements'
						? m.components_content_dialog_announcement_description()
						: m.components_content_dialog_testimonial_description()}
			</Dialog.Description>
		</Dialog.Header>

		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				{#if kind === 'banners'}
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="content-banner-key"
								>{m.components_content_dialog_placement()}</Field.Label
							>
							<Select.Root type="single" bind:value={form.key}>
								<Select.Trigger id="content-banner-key" class="w-full">
									<Select.Value placeholder={m.components_content_dialog_select_placement()} />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="hero" label={m.components_content_dialog_placement_hero()}
										>{m.components_content_dialog_placement_hero()}</Select.Item
									>
									<Select.Item value="promo" label={m.components_content_dialog_placement_promo()}
										>{m.components_content_dialog_placement_promo()}</Select.Item
									>
									<Select.Item value="cta" label={m.components_content_dialog_placement_cta()}
										>{m.components_content_dialog_placement_cta()}</Select.Item
									>
									<Select.Item value="category" label={m.common_category()}
										>{m.common_category()}</Select.Item
									>
								</Select.Content>
							</Select.Root>
						</Field.Field>

						<Field.Field>
							<Field.Label for="content-banner-title"
								>{m.components_content_dialog_title()}</Field.Label
							>
							<Input id="content-banner-title" bind:value={form.title} required />
						</Field.Field>
					</div>

					<Field.Field>
						<Field.Label for="content-banner-subtitle"
							>{m.components_content_dialog_subtitle()}</Field.Label
						>
						<Textarea id="content-banner-subtitle" bind:value={form.subtitle} rows={2} />
					</Field.Field>

					<Field.Field>
						<Field.Label>{m.components_form_image()}</Field.Label>
						<div class="flex items-center gap-3">
							{#if form.imageUrl}
								<img
									src={form.imageUrl}
									alt={m.components_content_dialog_banner_preview()}
									class="h-16 w-24 rounded-lg border bg-muted object-cover"
								/>
							{:else}
								<div
									class="flex h-16 w-24 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
								>
									<ImageIcon class="size-5" />
								</div>
							{/if}
							<div class="flex flex-wrap items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={() => chooseMedia('primary')}
								>
									{m.components_form_choose_image()}
								</Button>
								{#if form.imageUrl}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => (form.imageUrl = '')}
									>
										{m.common_remove()}
									</Button>
								{/if}
							</div>
						</div>
						<Field.Description>{m.components_content_dialog_banner_hint()}</Field.Description>
					</Field.Field>

					<Field.Field>
						<Field.Label>{m.components_content_dialog_mobile_image()}</Field.Label>
						<div class="flex items-center gap-3">
							{#if form.mobileImageUrl}
								<img
									src={form.mobileImageUrl}
									alt={m.components_content_dialog_mobile_preview()}
									class="h-16 w-16 rounded-lg border bg-muted object-cover"
								/>
							{:else}
								<div
									class="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
								>
									<ImageIcon class="size-5" />
								</div>
							{/if}
							<div class="flex flex-wrap items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={() => chooseMedia('mobile')}
								>
									{m.components_form_choose_image()}
								</Button>
								{#if form.mobileImageUrl}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => (form.mobileImageUrl = '')}
									>
										{m.common_remove()}
									</Button>
								{/if}
							</div>
						</div>
						<Field.Description>{m.components_content_dialog_mobile_hint()}</Field.Description>
					</Field.Field>

					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="content-banner-cta-label"
								>{m.components_content_dialog_cta_label()}</Field.Label
							>
							<Input
								id="content-banner-cta-label"
								bind:value={form.ctaLabel}
								placeholder={m.components_content_dialog_cta_placeholder()}
							/>
						</Field.Field>

						<Field.Field>
							<Field.Label for="content-banner-cta-url"
								>{m.components_content_dialog_cta_url()}</Field.Label
							>
							<Input id="content-banner-cta-url" bind:value={form.ctaUrl} placeholder="/products" />
						</Field.Field>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="content-banner-starts-at"
								>{m.components_form_starts_at()}</Field.Label
							>
							<Input
								id="content-banner-starts-at"
								type="datetime-local"
								bind:value={form.startsAt}
							/>
						</Field.Field>

						<Field.Field>
							<Field.Label for="content-banner-ends-at">{m.components_form_ends_at()}</Field.Label>
							<Input id="content-banner-ends-at" type="datetime-local" bind:value={form.endsAt} />
						</Field.Field>
					</div>
				{:else if kind === 'announcements'}
					<Field.Field>
						<Field.Label for="content-announcement-text"
							>{m.components_content_dialog_text()}</Field.Label
						>
						<Textarea id="content-announcement-text" bind:value={form.text} rows={3} required />
					</Field.Field>

					<Field.Field>
						<Field.Label for="content-announcement-link"
							>{m.components_content_dialog_link()}</Field.Label
						>
						<Input id="content-announcement-link" bind:value={form.link} placeholder="/products" />
					</Field.Field>

					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="content-announcement-starts-at"
								>{m.components_form_starts_at()}</Field.Label
							>
							<Input
								id="content-announcement-starts-at"
								type="datetime-local"
								bind:value={form.startsAt}
							/>
						</Field.Field>

						<Field.Field>
							<Field.Label for="content-announcement-ends-at"
								>{m.components_form_ends_at()}</Field.Label
							>
							<Input
								id="content-announcement-ends-at"
								type="datetime-local"
								bind:value={form.endsAt}
							/>
						</Field.Field>
					</div>
				{:else}
					<Field.Field>
						<Field.Label>{m.components_form_image()}</Field.Label>
						<div class="flex items-center gap-3">
							{#if form.imageUrl}
								<img
									src={form.imageUrl}
									alt={m.components_content_dialog_testimonial_preview()}
									class="h-16 w-16 rounded-lg border bg-muted object-cover"
								/>
							{:else}
								<div
									class="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
								>
									<ImageIcon class="size-5" />
								</div>
							{/if}
							<div class="flex flex-wrap items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={() => chooseMedia('primary')}
								>
									{m.components_form_choose_image()}
								</Button>
								{#if form.imageUrl}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => (form.imageUrl = '')}
									>
										{m.common_remove()}
									</Button>
								{/if}
							</div>
						</div>
						<Field.Description>{m.components_content_dialog_testimonial_hint()}</Field.Description>
					</Field.Field>

					<Field.Field>
						<Field.Label for="content-testimonial-caption"
							>{m.components_content_dialog_caption()}</Field.Label
						>
						<Textarea id="content-testimonial-caption" bind:value={form.caption} rows={2} />
					</Field.Field>

					<Field.Field>
						<Field.Label for="content-testimonial-link"
							>{m.components_content_dialog_link()}</Field.Label
						>
						<Input id="content-testimonial-link" bind:value={form.link} placeholder="/products" />
					</Field.Field>
				{/if}

				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="content-position">{m.components_form_position()}</Field.Label>
						<Input
							id="content-position"
							type="number"
							min="0"
							step="1"
							bind:value={form.position}
						/>
						<Field.Description>{m.components_content_dialog_position_hint()}</Field.Description>
					</Field.Field>

					<div class="flex items-center justify-between gap-3 rounded-lg border p-3">
						<div>
							<p class="text-sm font-medium">{m.common_active()}</p>
							<p class="text-xs text-muted-foreground">
								{m.components_content_dialog_active_hint()}
							</p>
						</div>
						<Switch bind:checked={form.active} aria-label={m.common_active()} />
					</div>
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
					{saving ? m.common_saving() : item ? m.common_save_changes() : m.common_create()}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<MediaPicker bind:open={mediaOpen} folder={mediaFolder} onSelect={handleSelect} />

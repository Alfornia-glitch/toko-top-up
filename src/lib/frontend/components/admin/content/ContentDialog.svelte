<script lang="ts" module>
	export type ContentKind = 'banners' | 'announcements' | 'testimonials';
</script>

<script lang="ts">
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
				? 'Edit banner'
				: kind === 'announcements'
					? 'Edit announcement'
					: 'Edit testimonial'
			: kind === 'banners'
				? 'New banner'
				: kind === 'announcements'
					? 'New announcement'
					: 'New testimonial'
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
			error = 'Position must be a whole number of zero or more.';
			return;
		}

		let payload: Record<string, unknown>;

		if (kind === 'banners') {
			if (!form.title.trim() || !form.imageUrl.trim()) {
				error = 'Title and image are required.';
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
				error = 'Announcement text is required.';
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
				error = 'Image is required.';
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

			if (!response.ok) throw new Error(result.error ?? 'Could not save content');

			open = false;
			await onsaved?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save content';
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
					? 'Storefront banner with an image, call to action and schedule.'
					: kind === 'announcements'
						? 'Short announcement shown in the storefront bar.'
						: 'Customer testimonial image with an optional caption.'}
			</Dialog.Description>
		</Dialog.Header>

		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				{#if kind === 'banners'}
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="content-banner-key">Placement</Field.Label>
							<Select.Root type="single" bind:value={form.key}>
								<Select.Trigger id="content-banner-key" class="w-full">
									<Select.Value placeholder="Select placement" />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="hero" label="Hero">Hero</Select.Item>
									<Select.Item value="promo" label="Promo">Promo</Select.Item>
									<Select.Item value="cta" label="Call to action">Call to action</Select.Item>
									<Select.Item value="category" label="Category">Category</Select.Item>
								</Select.Content>
							</Select.Root>
						</Field.Field>

						<Field.Field>
							<Field.Label for="content-banner-title">Title</Field.Label>
							<Input id="content-banner-title" bind:value={form.title} required />
						</Field.Field>
					</div>

					<Field.Field>
						<Field.Label for="content-banner-subtitle">Subtitle</Field.Label>
						<Textarea id="content-banner-subtitle" bind:value={form.subtitle} rows={2} />
					</Field.Field>

					<Field.Field>
						<Field.Label>Image</Field.Label>
						<div class="flex items-center gap-3">
							{#if form.imageUrl}
								<img
									src={form.imageUrl}
									alt="Banner preview"
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
									Choose image
								</Button>
								{#if form.imageUrl}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => (form.imageUrl = '')}
									>
										Remove
									</Button>
								{/if}
							</div>
						</div>
						<Field.Description>Pick an image from the banners folder.</Field.Description>
					</Field.Field>

					<Field.Field>
						<Field.Label>Mobile image</Field.Label>
						<div class="flex items-center gap-3">
							{#if form.mobileImageUrl}
								<img
									src={form.mobileImageUrl}
									alt="Mobile banner preview"
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
									Choose image
								</Button>
								{#if form.mobileImageUrl}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => (form.mobileImageUrl = '')}
									>
										Remove
									</Button>
								{/if}
							</div>
						</div>
						<Field.Description>Optional image used on small screens.</Field.Description>
					</Field.Field>

					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="content-banner-cta-label">CTA label</Field.Label>
							<Input
								id="content-banner-cta-label"
								bind:value={form.ctaLabel}
								placeholder="Shop now"
							/>
						</Field.Field>

						<Field.Field>
							<Field.Label for="content-banner-cta-url">CTA URL</Field.Label>
							<Input id="content-banner-cta-url" bind:value={form.ctaUrl} placeholder="/products" />
						</Field.Field>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="content-banner-starts-at">Starts at</Field.Label>
							<Input
								id="content-banner-starts-at"
								type="datetime-local"
								bind:value={form.startsAt}
							/>
						</Field.Field>

						<Field.Field>
							<Field.Label for="content-banner-ends-at">Ends at</Field.Label>
							<Input id="content-banner-ends-at" type="datetime-local" bind:value={form.endsAt} />
						</Field.Field>
					</div>
				{:else if kind === 'announcements'}
					<Field.Field>
						<Field.Label for="content-announcement-text">Text</Field.Label>
						<Textarea id="content-announcement-text" bind:value={form.text} rows={3} required />
					</Field.Field>

					<Field.Field>
						<Field.Label for="content-announcement-link">Link</Field.Label>
						<Input id="content-announcement-link" bind:value={form.link} placeholder="/products" />
					</Field.Field>

					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="content-announcement-starts-at">Starts at</Field.Label>
							<Input
								id="content-announcement-starts-at"
								type="datetime-local"
								bind:value={form.startsAt}
							/>
						</Field.Field>

						<Field.Field>
							<Field.Label for="content-announcement-ends-at">Ends at</Field.Label>
							<Input
								id="content-announcement-ends-at"
								type="datetime-local"
								bind:value={form.endsAt}
							/>
						</Field.Field>
					</div>
				{:else}
					<Field.Field>
						<Field.Label>Image</Field.Label>
						<div class="flex items-center gap-3">
							{#if form.imageUrl}
								<img
									src={form.imageUrl}
									alt="Testimonial preview"
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
									Choose image
								</Button>
								{#if form.imageUrl}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => (form.imageUrl = '')}
									>
										Remove
									</Button>
								{/if}
							</div>
						</div>
						<Field.Description>Pick an image from the testimonials folder.</Field.Description>
					</Field.Field>

					<Field.Field>
						<Field.Label for="content-testimonial-caption">Caption</Field.Label>
						<Textarea id="content-testimonial-caption" bind:value={form.caption} rows={2} />
					</Field.Field>

					<Field.Field>
						<Field.Label for="content-testimonial-link">Link</Field.Label>
						<Input id="content-testimonial-link" bind:value={form.link} placeholder="/products" />
					</Field.Field>
				{/if}

				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="content-position">Position</Field.Label>
						<Input
							id="content-position"
							type="number"
							min="0"
							step="1"
							bind:value={form.position}
						/>
						<Field.Description>Lower values appear first.</Field.Description>
					</Field.Field>

					<div class="flex items-center justify-between gap-3 rounded-lg border p-3">
						<div>
							<p class="text-sm font-medium">Active</p>
							<p class="text-xs text-muted-foreground">Show this item on the storefront.</p>
						</div>
						<Switch bind:checked={form.active} aria-label="Active" />
					</div>
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
					{saving ? 'Saving…' : item ? 'Save changes' : 'Create'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<MediaPicker bind:open={mediaOpen} folder={mediaFolder} onSelect={handleSelect} />

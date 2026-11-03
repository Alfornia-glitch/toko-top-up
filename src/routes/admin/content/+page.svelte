<script lang="ts">
	import { onMount } from 'svelte';
	import { Image as ImageIcon, Pencil, Plus, Trash2 } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import ConfirmDialog from '#lib/frontend/components/admin/ConfirmDialog.svelte';
	import ContentDialog from '#lib/frontend/components/admin/content/ContentDialog.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Tabs from '#lib/frontend/components/ui/tabs/index.ts';

	type Kind = 'banners' | 'announcements' | 'testimonials';
	type ContentRow = Record<string, unknown>;

	const kinds: { value: Kind; label: string }[] = [
		{ value: 'banners', label: 'Banners' },
		{ value: 'announcements', label: 'Announcements' },
		{ value: 'testimonials', label: 'Testimonials' }
	];

	let activeTab = $state<Kind>('banners');
	let data = $state<Record<Kind, ContentRow[]>>({
		banners: [],
		announcements: [],
		testimonials: []
	});
	let loading = $state<Record<Kind, boolean>>({
		banners: true,
		announcements: true,
		testimonials: true
	});
	let errors = $state<Record<Kind, string>>({
		banners: '',
		announcements: '',
		testimonials: ''
	});
	let actionError = $state('');

	let dialogOpen = $state(false);
	let dialogKind = $state<Kind>('banners');
	let editing = $state<ContentRow | null>(null);

	let deleteOpen = $state(false);
	let deleteKind = $state<Kind>('banners');
	let deleteTarget = $state<ContentRow | null>(null);

	const activeRows = $derived(data[activeTab]);
	const activeLoading = $derived(loading[activeTab]);
	const activeError = $derived(errors[activeTab]);

	const columns = $derived.by(() => {
		if (activeTab === 'banners') {
			return [
				{ key: 'imageUrl', label: 'Image' },
				{ key: 'title', label: 'Title' },
				{ key: 'key', label: 'Placement' },
				{ key: 'position', label: 'Position', class: 'text-right' },
				{ key: 'active', label: 'Active' },
				{ key: 'startsAt', label: 'Starts' },
				{ key: 'endsAt', label: 'Ends' },
				{ key: 'actions', label: '', class: 'text-right' }
			];
		}

		if (activeTab === 'announcements') {
			return [
				{ key: 'text', label: 'Text' },
				{ key: 'position', label: 'Position', class: 'text-right' },
				{ key: 'active', label: 'Active' },
				{ key: 'startsAt', label: 'Starts' },
				{ key: 'endsAt', label: 'Ends' },
				{ key: 'actions', label: '', class: 'text-right' }
			];
		}

		return [
			{ key: 'imageUrl', label: 'Image' },
			{ key: 'caption', label: 'Caption' },
			{ key: 'position', label: 'Position', class: 'text-right' },
			{ key: 'active', label: 'Active' },
			{ key: 'actions', label: '', class: 'text-right' }
		];
	});

	const emptyMessage = $derived(
		activeTab === 'banners'
			? 'No banners yet.'
			: activeTab === 'announcements'
				? 'No announcements yet.'
				: 'No testimonials yet.'
	);

	onMount(() => {
		void loadKind('banners');
		void loadKind('announcements');
		void loadKind('testimonials');
	});

	async function loadKind(kind: Kind) {
		loading[kind] = true;
		errors[kind] = '';

		try {
			const response = await fetch(`/api/admin/content/${kind}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load content');

			data[kind] = payload.data ?? [];
		} catch (err) {
			errors[kind] = err instanceof Error ? err.message : 'Could not load content';
		} finally {
			loading[kind] = false;
		}
	}

	function openCreate() {
		editing = null;
		dialogKind = activeTab;
		dialogOpen = true;
	}

	function openEdit(row: ContentRow) {
		editing = row;
		dialogKind = activeTab;
		dialogOpen = true;
	}

	async function handleSaved() {
		await loadKind(dialogKind);
	}

	function openDelete(row: ContentRow) {
		deleteTarget = row;
		deleteKind = activeTab;
		deleteOpen = true;
	}

	async function deleteItem() {
		if (!deleteTarget) return;

		actionError = '';

		try {
			const response = await fetch(`/api/admin/content/${deleteKind}/${String(deleteTarget.id)}`, {
				method: 'DELETE'
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not delete content');

			await loadKind(deleteKind);
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Could not delete content';
		} finally {
			deleteTarget = null;
		}
	}

	function str(value: unknown) {
		return value === null || value === undefined ? '' : String(value);
	}

	function formatDate(value: unknown) {
		if (!value) return '—';
		const date = new Date(String(value));
		if (Number.isNaN(date.getTime())) return '—';

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Content</h1>
			<p class="text-sm text-muted-foreground">
				Manage storefront banners, announcements and testimonials.
			</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="size-4" />
			New {activeTab === 'banners'
				? 'banner'
				: activeTab === 'announcements'
					? 'announcement'
					: 'testimonial'}
		</Button>
	</div>

	{#if actionError}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
			role="alert"
		>
			{actionError}
		</div>
	{/if}

	<Tabs.Root value={activeTab} onValueChange={(value) => (activeTab = value as Kind)}>
		<Tabs.List>
			{#each kinds as kind (kind.value)}
				<Tabs.Trigger value={kind.value}>{kind.label}</Tabs.Trigger>
			{/each}
		</Tabs.List>

		{#each kinds as kind (kind.value)}
			<Tabs.Content value={kind.value} class="mt-4 space-y-4">
				{#if activeError}
					<div
						class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
						role="alert"
					>
						{activeError}
					</div>
				{/if}

				<DataTable
					{columns}
					rows={activeRows}
					loading={activeLoading}
					{emptyMessage}
					page={1}
					pageSize={Math.max(1, activeRows.length)}
					total={activeRows.length}
				>
					{#snippet cell(row, column)}
						{#if column.key === 'imageUrl'}
							{#if row.imageUrl}
								<img
									src={String(row.imageUrl)}
									alt={activeTab === 'banners' ? 'Banner thumbnail' : 'Testimonial thumbnail'}
									class="size-10 rounded-md border bg-muted object-cover"
									loading="lazy"
								/>
							{:else}
								<div
									class="flex size-10 items-center justify-center rounded-md border bg-muted text-muted-foreground"
								>
									<ImageIcon class="size-4" />
								</div>
							{/if}
						{:else if column.key === 'title'}
							<span class="font-medium">{str(row.title)}</span>
						{:else if column.key === 'key'}
							<span class="capitalize">{str(row.key)}</span>
						{:else if column.key === 'text'}
							<span class="block max-w-md truncate">{str(row.text)}</span>
						{:else if column.key === 'caption'}
							<span class="block max-w-md truncate text-muted-foreground">
								{str(row.caption) || '—'}
							</span>
						{:else if column.key === 'position'}
							{Number(row.position ?? 0)}
						{:else if column.key === 'active'}
							<StatusBadge status={row.active ? 'active' : 'inactive'} />
						{:else if column.key === 'startsAt'}
							<span class="text-muted-foreground">{formatDate(row.startsAt)}</span>
						{:else if column.key === 'endsAt'}
							<span class="text-muted-foreground">{formatDate(row.endsAt)}</span>
						{:else if column.key === 'actions'}
							<div class="flex items-center justify-end gap-1">
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label="Edit content"
									onclick={() => openEdit(row)}
								>
									<Pencil class="size-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									class="text-destructive hover:bg-destructive/10"
									aria-label="Delete content"
									onclick={() => openDelete(row)}
								>
									<Trash2 class="size-4" />
								</Button>
							</div>
						{:else}
							{str(row[column.key]) || '—'}
						{/if}
					{/snippet}
				</DataTable>
			</Tabs.Content>
		{/each}
	</Tabs.Root>
</div>

{#if dialogOpen}
	<ContentDialog bind:open={dialogOpen} kind={dialogKind} item={editing} onsaved={handleSaved} />
{/if}

<ConfirmDialog
	bind:open={deleteOpen}
	title="Delete content"
	description="Delete this item? This action cannot be undone."
	confirmLabel="Delete"
	destructive
	onConfirm={deleteItem}
/>

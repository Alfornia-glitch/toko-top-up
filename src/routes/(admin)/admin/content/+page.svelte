<script lang="ts">
	import { onMount } from 'svelte';
	import { Image as ImageIcon, Pencil, Plus, Trash2 } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import ConfirmDialog from '#lib/frontend/components/admin/ConfirmDialog.svelte';
	import ContentDialog from '#lib/frontend/components/admin/content/ContentDialog.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Tabs from '#lib/frontend/components/ui/tabs/index.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { formatDateTime } from '#lib/frontend/modules/commerce/format.ts';

	type Kind = 'banners' | 'announcements' | 'testimonials';
	type ContentRow = Record<string, unknown>;

	const kinds = $derived<{ value: Kind; label: string }[]>([
		{ value: 'banners', label: m.admin_catalog_content_tab_banners() },
		{ value: 'announcements', label: m.admin_catalog_content_tab_announcements() },
		{ value: 'testimonials', label: m.admin_catalog_content_tab_testimonials() }
	]);

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
				{ key: 'imageUrl', label: m.admin_catalog_content_col_image() },
				{ key: 'title', label: m.admin_catalog_content_col_title() },
				{ key: 'key', label: m.admin_catalog_content_col_placement() },
				{ key: 'position', label: m.admin_catalog_content_col_position(), class: 'text-right' },
				{ key: 'active', label: m.common_active() },
				{ key: 'startsAt', label: m.admin_catalog_content_col_starts() },
				{ key: 'endsAt', label: m.admin_catalog_content_col_ends() },
				{ key: 'actions', label: '', class: 'text-right' }
			];
		}

		if (activeTab === 'announcements') {
			return [
				{ key: 'text', label: m.admin_catalog_content_col_text() },
				{ key: 'position', label: m.admin_catalog_content_col_position(), class: 'text-right' },
				{ key: 'active', label: m.common_active() },
				{ key: 'startsAt', label: m.admin_catalog_content_col_starts() },
				{ key: 'endsAt', label: m.admin_catalog_content_col_ends() },
				{ key: 'actions', label: '', class: 'text-right' }
			];
		}

		return [
			{ key: 'imageUrl', label: m.admin_catalog_content_col_image() },
			{ key: 'caption', label: m.admin_catalog_content_col_caption() },
			{ key: 'position', label: m.admin_catalog_content_col_position(), class: 'text-right' },
			{ key: 'active', label: m.common_active() },
			{ key: 'actions', label: '', class: 'text-right' }
		];
	});

	const emptyMessage = $derived(
		activeTab === 'banners'
			? m.admin_catalog_content_empty_banners()
			: activeTab === 'announcements'
				? m.admin_catalog_content_empty_announcements()
				: m.admin_catalog_content_empty_testimonials()
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

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_catalog_content_load_failed'));

			data[kind] = payload.data ?? [];
		} catch (err) {
			errors[kind] = errorMessage(err, 'admin_catalog_content_load_failed');
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

			if (!response.ok)
				throw new Error(errorMessage(payload, 'admin_catalog_content_delete_failed'));

			await loadKind(deleteKind);
		} catch (err) {
			actionError = errorMessage(err, 'admin_catalog_content_delete_failed');
		} finally {
			deleteTarget = null;
		}
	}

	function placementLabel(value: string) {
		switch (value) {
			case 'hero':
				return m.admin_catalog_content_placement_hero();
			case 'promo':
				return m.admin_catalog_content_placement_promo();
			case 'cta':
				return m.admin_catalog_content_placement_cta();
			case 'category':
				return m.admin_catalog_content_placement_category();
			default:
				return value;
		}
	}

	function str(value: unknown) {
		return value === null || value === undefined ? '' : String(value);
	}

	function formatDate(value: unknown) {
		if (!value) return m.common_dash();

		return formatDateTime(String(value)) || m.common_dash();
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.admin_catalog_content_title()}</h1>
			<p class="text-sm text-muted-foreground">
				{m.admin_catalog_content_subtitle()}
			</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="size-4" />
			{activeTab === 'banners'
				? m.admin_catalog_content_new_banner()
				: activeTab === 'announcements'
					? m.admin_catalog_content_new_announcement()
					: m.admin_catalog_content_new_testimonial()}
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
									alt={activeTab === 'banners'
										? m.admin_catalog_content_banner_thumbnail_alt()
										: m.admin_catalog_content_testimonial_thumbnail_alt()}
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
							<span>{placementLabel(str(row.key))}</span>
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
									aria-label={m.admin_catalog_content_edit_aria()}
									onclick={() => openEdit(row)}
								>
									<Pencil class="size-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									class="text-destructive hover:bg-destructive/10"
									aria-label={m.admin_catalog_content_delete_aria()}
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
	title={m.admin_catalog_content_delete_title()}
	description={m.admin_catalog_content_delete_description()}
	confirmLabel={m.common_delete()}
	cancelLabel={m.common_cancel()}
	destructive
	onConfirm={deleteItem}
/>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Pencil, Plus, Trash2 } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import * as Dialog from '#lib/frontend/components/ui/dialog/index.ts';
	import * as AlertDialog from '#lib/frontend/components/ui/alert-dialog/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { formatDateTime } from '#lib/frontend/modules/commerce/format.ts';

	type SettingRow = {
		key: string;
		valueJson: unknown;
		updatedBy: string | null;
		updatedAt: string;
	};

	const columns = $derived([
		{ key: 'key', label: m.admin_super_settings_col_key() },
		{
			key: 'valueJson',
			label: m.admin_super_settings_col_value(),
			class: 'max-w-md whitespace-normal'
		},
		{ key: 'updatedAt', label: m.admin_super_col_updated() },
		{ key: 'actions', label: '', class: 'text-right' }
	]);

	let settings = $state<SettingRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	let dialogOpen = $state(false);
	let editingKey = $state<string | null>(null);
	let formKey = $state('');
	let formValue = $state('{}');
	let formError = $state('');
	let saving = $state(false);

	let deleteOpen = $state(false);
	let deletingKey = $state<string | null>(null);
	let deleteConfirm = $state('');
	let deleting = $state(false);

	const canDelete = $derived(deletingKey !== null && deleteConfirm.trim() === deletingKey);

	function stringify(value: unknown) {
		return JSON.stringify(value, null, 2) ?? 'null';
	}

	onMount(() => {
		void loadSettings();
	});

	async function loadSettings() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/admin/super/settings');
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw payload;

			settings = payload.data ?? [];
		} catch (err) {
			error = errorMessage(err, 'admin_super_settings_load_failed');
		} finally {
			loading = false;
		}
	}

	function openCreate() {
		editingKey = null;
		formKey = '';
		formValue = '{}';
		formError = '';
		dialogOpen = true;
	}

	function openEdit(row: Record<string, unknown>) {
		const item = settings.find((setting) => setting.key === String(row.key));
		if (!item) return;

		editingKey = item.key;
		formKey = item.key;
		formValue = stringify(item.valueJson);
		formError = '';
		dialogOpen = true;
	}

	function openDelete(row: Record<string, unknown>) {
		const item = settings.find((setting) => setting.key === String(row.key));
		if (!item) return;

		deletingKey = item.key;
		deleteConfirm = '';
		error = '';
		deleteOpen = true;
	}

	async function saveSetting(event: SubmitEvent) {
		event.preventDefault();
		formError = '';

		const key = formKey.trim();
		if (!key) {
			formError = m.admin_super_settings_key_required();
			return;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(formValue);
		} catch {
			formError = m.admin_super_settings_invalid_json();
			return;
		}

		saving = true;

		try {
			const response = await fetch('/api/admin/super/settings', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ [key]: parsed })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw payload;

			dialogOpen = false;
			await loadSettings();
		} catch (err) {
			formError = errorMessage(err, 'admin_super_settings_save_failed');
		} finally {
			saving = false;
		}
	}

	async function deleteSetting() {
		if (!deletingKey || !canDelete) return;

		deleting = true;
		error = '';

		try {
			const response = await fetch(`/api/admin/super/settings/${encodeURIComponent(deletingKey)}`, {
				method: 'DELETE'
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw payload;

			deleteOpen = false;
			deletingKey = null;
			await loadSettings();
		} catch (err) {
			error = errorMessage(err, 'admin_super_settings_delete_failed');
		} finally {
			deleting = false;
		}
	}

	const layoutOptions = [
		{
			value: 'regular',
			label: 'Regular ecommerce',
			description: 'Mega menu, deals, brands and new arrivals on the home page.'
		},
		{
			value: 'topup',
			label: 'Top-up store',
			description: 'Compact game top-up header, game categories and testimonials.'
		}
	] as const;

	const currentLayout = $derived(
		settings.find((setting) => setting.key === 'storefrontLayout')?.valueJson === 'topup'
			? 'topup'
			: 'regular'
	);

	let layoutSaving = $state(false);

	async function saveLayout(value: 'regular' | 'topup') {
		if (value === currentLayout || layoutSaving) return;

		layoutSaving = true;
		error = '';

		try {
			const response = await fetch('/api/admin/super/settings', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ storefrontLayout: value })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not save storefront layout');

			await loadSettings();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save storefront layout';
		} finally {
			layoutSaving = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.common_settings()}</h1>
			<p class="text-sm text-muted-foreground">
				{m.admin_super_settings_subtitle()}
			</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="size-4" />
			{m.admin_super_settings_new()}
		</Button>
	</div>

	{#if error}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
		>
			{error}
		</div>
	{/if}

	<section class="space-y-3" aria-labelledby="storefront-layout-heading">
		<div>
			<h2 id="storefront-layout-heading" class="text-base font-medium">Storefront layout</h2>
			<p class="text-sm text-muted-foreground">
				Choose which look the public storefront uses. Changes apply after the next page load.
			</p>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each layoutOptions as option (option.value)}
				{@const selected = currentLayout === option.value}
				<button
					type="button"
					aria-pressed={selected}
					disabled={layoutSaving}
					onclick={() => saveLayout(option.value)}
					class="rounded-lg border p-4 text-left transition-colors disabled:opacity-60 {selected
						? 'border-primary bg-primary/5'
						: 'border-border hover:bg-muted'}"
				>
					<span class="flex items-center justify-between gap-2">
						<span class="text-sm font-medium">{option.label}</span>
						{#if selected}
							<span class="text-xs font-medium text-primary">Active</span>
						{/if}
					</span>
					<span class="mt-1 block text-sm text-muted-foreground">{option.description}</span>
				</button>
			{/each}
		</div>
	</section>

	<DataTable
		{columns}
		rows={settings as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage={m.admin_super_settings_empty()}
		page={1}
		pageSize={Math.max(1, settings.length)}
		total={settings.length}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'key'}
				<code class="text-xs font-medium">{String(row.key ?? '')}</code>
			{:else if column.key === 'valueJson'}
				<pre
					class="max-h-40 overflow-auto text-xs break-words whitespace-pre-wrap text-muted-foreground">{stringify(
						row.valueJson
					)}</pre>
			{:else if column.key === 'updatedAt'}
				<span class="text-muted-foreground"
					>{formatDateTime(String(row.updatedAt ?? '')) || m.common_dash()}</span
				>
			{:else if column.key === 'actions'}
				<div class="flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={m.admin_super_settings_edit_aria()}
						onclick={() => openEdit(row)}
					>
						<Pencil class="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						class="text-destructive hover:bg-destructive/10"
						aria-label={m.admin_super_settings_delete_aria()}
						onclick={() => openDelete(row)}
					>
						<Trash2 class="size-4" />
					</Button>
				</div>
			{:else}
				{String(row[column.key] ?? m.common_dash())}
			{/if}
		{/snippet}
	</DataTable>
</div>

{#if dialogOpen}
	<Dialog.Root bind:open={dialogOpen}>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title
					>{editingKey
						? m.admin_super_settings_edit_title()
						: m.admin_super_settings_new()}</Dialog.Title
				>
				<Dialog.Description>
					{editingKey ? m.admin_super_settings_edit_desc() : m.admin_super_settings_new_desc()}
				</Dialog.Description>
			</Dialog.Header>

			<form class="grid gap-4" onsubmit={saveSetting}>
				<Field.Group>
					<Field.Field>
						<Field.Label for="setting-key">{m.admin_super_settings_col_key()}</Field.Label>
						<Input
							id="setting-key"
							bind:value={formKey}
							placeholder={m.admin_super_settings_key_placeholder()}
							disabled={editingKey !== null}
							required
						/>
					</Field.Field>

					<Field.Field>
						<Field.Label for="setting-value">{m.admin_super_settings_value_label()}</Field.Label>
						<Textarea
							id="setting-value"
							bind:value={formValue}
							class="min-h-40 font-mono text-xs"
							spellcheck="false"
							required
						/>
						<Field.Description>
							{m.admin_super_settings_value_hint()}
						</Field.Description>
					</Field.Field>
				</Field.Group>

				{#if formError}
					<Field.Error>{formError}</Field.Error>
				{/if}

				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						onclick={() => (dialogOpen = false)}
						disabled={saving}
					>
						{m.common_cancel()}
					</Button>
					<Button type="submit" disabled={saving}>
						{saving ? m.common_saving() : m.admin_super_settings_save()}
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<AlertDialog.Root bind:open={deleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.admin_super_settings_delete_title()}</AlertDialog.Title>
			<AlertDialog.Description>
				{m.admin_super_settings_delete_before()}
				<code class="font-medium">{deletingKey ?? ''}</code>
				{m.admin_super_settings_delete_after()}
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="grid gap-2">
			<Field.Label for="delete-setting-confirm">{m.common_confirm()}</Field.Label>
			<Input
				id="delete-setting-confirm"
				bind:value={deleteConfirm}
				placeholder={deletingKey ?? ''}
			/>
		</div>

		{#if error}
			<Field.Error>{error}</Field.Error>
		{/if}

		<AlertDialog.Footer>
			<AlertDialog.Cancel>{m.common_cancel()}</AlertDialog.Cancel>
			<Button
				type="button"
				class="bg-destructive text-white hover:bg-destructive/90"
				disabled={!canDelete || deleting}
				onclick={deleteSetting}
			>
				{deleting ? m.common_deleting() : m.common_delete()}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

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

	type SettingRow = {
		key: string;
		valueJson: unknown;
		updatedBy: string | null;
		updatedAt: string;
	};

	const columns = [
		{ key: 'key', label: 'Key' },
		{ key: 'valueJson', label: 'Value', class: 'max-w-md whitespace-normal' },
		{ key: 'updatedAt', label: 'Updated' },
		{ key: 'actions', label: '', class: 'text-right' }
	];

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

	function formatDate(value: string) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
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

			if (!response.ok) throw new Error(payload.error ?? 'Could not load settings');

			settings = payload.data ?? [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load settings';
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
			formError = 'Key is required.';
			return;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(formValue);
		} catch {
			formError = 'Value must be valid JSON.';
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

			if (!response.ok) throw new Error(payload.error ?? 'Could not save setting');

			dialogOpen = false;
			await loadSettings();
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Could not save setting';
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

			if (!response.ok) throw new Error(payload.error ?? 'Could not delete setting');

			deleteOpen = false;
			deletingKey = null;
			await loadSettings();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not delete setting';
		} finally {
			deleting = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
			<p class="text-sm text-muted-foreground">
				Platform configuration stored as JSON key/value pairs.
			</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="size-4" />
			New setting
		</Button>
	</div>

	{#if error}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
		>
			{error}
		</div>
	{/if}

	<DataTable
		{columns}
		rows={settings as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No settings yet."
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
				<span class="text-muted-foreground">{formatDate(String(row.updatedAt ?? ''))}</span>
			{:else if column.key === 'actions'}
				<div class="flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Edit setting"
						onclick={() => openEdit(row)}
					>
						<Pencil class="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						class="text-destructive hover:bg-destructive/10"
						aria-label="Delete setting"
						onclick={() => openDelete(row)}
					>
						<Trash2 class="size-4" />
					</Button>
				</div>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

{#if dialogOpen}
	<Dialog.Root bind:open={dialogOpen}>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title>{editingKey ? 'Edit setting' : 'New setting'}</Dialog.Title>
				<Dialog.Description>
					{editingKey ? 'Update the JSON value for this key.' : 'Create a new configuration entry.'}
				</Dialog.Description>
			</Dialog.Header>

			<form class="grid gap-4" onsubmit={saveSetting}>
				<Field.Group>
					<Field.Field>
						<Field.Label for="setting-key">Key</Field.Label>
						<Input
							id="setting-key"
							bind:value={formKey}
							placeholder="e.g. store.name"
							disabled={editingKey !== null}
							required
						/>
					</Field.Field>

					<Field.Field>
						<Field.Label for="setting-value">Value (JSON)</Field.Label>
						<Textarea
							id="setting-value"
							bind:value={formValue}
							class="min-h-40 font-mono text-xs"
							spellcheck="false"
							required
						/>
						<Field.Description>
							Must be valid JSON such as a string, number, object or array.
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
						Cancel
					</Button>
					<Button type="submit" disabled={saving}>
						{saving ? 'Saving…' : 'Save setting'}
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<AlertDialog.Root bind:open={deleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete setting</AlertDialog.Title>
			<AlertDialog.Description>
				Type the key <code class="font-medium">{deletingKey ?? ''}</code> to confirm. This action cannot
				be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="grid gap-2">
			<Field.Label for="delete-setting-confirm">Confirmation</Field.Label>
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
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<Button
				type="button"
				class="bg-destructive text-white hover:bg-destructive/90"
				disabled={!canDelete || deleting}
				onclick={deleteSetting}
			>
				{deleting ? 'Deleting…' : 'Delete'}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/svelte';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Switch } from '#lib/frontend/components/ui/switch/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import type {
		AccountFieldType,
		AccountFormField,
		SiteSettings
	} from '#lib/frontend/modules/commerce/models.ts';

	/** Editor row: options are edited as one-per-line text; `idTouched` stops auto-ids. */
	interface Draft {
		key: number;
		id: string;
		idTouched: boolean;
		label: string;
		type: AccountFieldType;
		required: boolean;
		placeholder: string;
		helpText: string;
		options: string;
	}

	const MAX_FIELDS = 20;

	let { active }: { active: boolean } = $props();

	let drafts = $state<Draft[]>([]);
	let saved = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let notice = $state('');
	let nextKey = 0;

	const typeOptions = $derived<Array<{ value: AccountFieldType; label: string }>>([
		{ value: 'text', label: m.admin_super_account_form_type_text() },
		{ value: 'number', label: m.admin_super_account_form_type_number() },
		{ value: 'email', label: m.admin_super_account_form_type_email() },
		{ value: 'tel', label: m.admin_super_account_form_type_tel() },
		{ value: 'select', label: m.admin_super_account_form_type_select() },
		{ value: 'textarea', label: m.admin_super_account_form_type_textarea() }
	]);

	const payload = $derived(toFields(drafts));
	const dirty = $derived(JSON.stringify(payload) !== saved);

	function slug(label: string): string {
		return label
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '')
			.slice(0, 40);
	}

	function toDraft(field: AccountFormField): Draft {
		return {
			key: nextKey++,
			id: field.id,
			idTouched: true,
			label: field.label,
			type: field.type,
			required: field.required,
			placeholder: field.placeholder,
			helpText: field.helpText,
			options: field.options.join('\n')
		};
	}

	function optionList(draft: Draft): string[] {
		return [
			...new Set(
				draft.options
					.split('\n')
					.map((option) => option.trim())
					.filter(Boolean)
			)
		];
	}

	function toFields(rows: Draft[]): AccountFormField[] {
		return rows.map((draft) => ({
			id: draft.id.trim(),
			label: draft.label.trim(),
			type: draft.type,
			required: draft.required,
			placeholder: draft.placeholder.trim(),
			helpText: draft.helpText.trim(),
			options: draft.type === 'select' ? optionList(draft) : []
		}));
	}

	function validate(fields: AccountFormField[]): string {
		const ids = new Set<string>();

		for (const [index, field] of fields.entries()) {
			const position = index + 1;
			if (!field.label) return m.admin_super_account_form_label_required({ position });
			if (!/^[a-z0-9_]{1,40}$/.test(field.id))
				return m.admin_super_account_form_id_invalid({ position });
			if (ids.has(field.id)) return m.admin_super_account_form_id_duplicate({ id: field.id });
			if (field.type === 'select' && field.options.length === 0)
				return m.admin_super_account_form_options_required({ label: field.label });
			ids.add(field.id);
		}

		return '';
	}

	function updateLabel(draft: Draft, value: string) {
		draft.label = value;
		if (!draft.idTouched) draft.id = slug(value);
	}

	function updateId(draft: Draft, value: string) {
		draft.id = value;
		draft.idTouched = true;
	}

	function addField() {
		if (drafts.length >= MAX_FIELDS) return;
		drafts.push({
			key: nextKey++,
			id: '',
			idTouched: false,
			label: '',
			type: 'text',
			required: false,
			placeholder: '',
			helpText: '',
			options: ''
		});
		notice = '';
	}

	function move(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= drafts.length) return;
		const [row] = drafts.splice(index, 1);
		drafts.splice(target, 0, row);
	}

	function remove(index: number) {
		drafts.splice(index, 1);
		notice = '';
	}

	function apply(fields: AccountFormField[]) {
		drafts = fields.map(toDraft);
		saved = JSON.stringify(toFields(drafts));
	}

	async function load() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/storefront/site');
			const body = await response.json().catch(() => ({}));
			if (!response.ok) throw body;
			apply((body.data as SiteSettings).topupAccountForm ?? []);
		} catch (cause) {
			error = errorMessage(cause, 'admin_super_account_form_load_failed');
		} finally {
			loading = false;
		}
	}

	async function save() {
		error = '';
		notice = '';

		const fields = payload;
		const problem = validate(fields);
		if (problem) {
			error = problem;
			return;
		}

		saving = true;

		try {
			const response = await fetch('/api/admin/super/settings', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ topupAccountForm: fields })
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) throw body;

			await load();
			notice = m.admin_super_account_form_saved();
		} catch (cause) {
			error = errorMessage(cause, 'admin_super_account_form_save_failed');
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<section class="space-y-3" aria-labelledby="account-form-heading">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 id="account-form-heading" class="flex items-center gap-2 text-base font-medium">
				{m.admin_super_account_form_title()}
				{#if !active}
					<Badge variant="secondary">{m.admin_super_account_form_inactive()}</Badge>
				{/if}
			</h2>
			<p class="text-sm text-muted-foreground">{m.admin_super_account_form_desc()}</p>
		</div>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				onclick={addField}
				disabled={loading || saving || drafts.length >= MAX_FIELDS}
			>
				<Plus class="size-4" />
				{m.admin_super_account_form_add()}
			</Button>
			<Button onclick={save} disabled={loading || saving || !dirty}>
				{saving ? m.common_saving() : m.admin_super_account_form_save()}
			</Button>
		</div>
	</div>

	{#if error}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
			role="alert"
		>
			{error}
		</div>
	{/if}
	{#if notice}
		<div
			class="rounded-lg border border-emerald-600/30 bg-emerald-50 p-3 text-sm text-emerald-700"
			role="status"
		>
			{notice}
		</div>
	{/if}

	{#if loading}
		<Skeleton class="h-40 w-full rounded-lg" />
	{:else if drafts.length === 0}
		<div class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
			{m.admin_super_account_form_empty()}
		</div>
	{:else}
		<div class="grid gap-3">
			{#each drafts as draft, index (draft.key)}
				{@const prefix = `account-field-${draft.key}`}
				<Card.Root class="gap-4 py-4">
					<Card.Content class="grid gap-4 px-4">
						<div class="flex items-center justify-between gap-2">
							<span class="text-sm font-medium text-muted-foreground">
								{m.admin_super_account_form_field_n({ position: index + 1 })}
							</span>
							<div class="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label={m.admin_super_account_form_move_up()}
									disabled={index === 0}
									onclick={() => move(index, -1)}
								>
									<ArrowUp class="size-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label={m.admin_super_account_form_move_down()}
									disabled={index === drafts.length - 1}
									onclick={() => move(index, 1)}
								>
									<ArrowDown class="size-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									class="text-destructive hover:bg-destructive/10"
									aria-label={m.admin_super_account_form_remove()}
									onclick={() => remove(index)}
								>
									<Trash2 class="size-4" />
								</Button>
							</div>
						</div>

						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<Field.Field>
								<Field.Label for="{prefix}-label">{m.admin_super_account_form_label()}</Field.Label>
								<Input
									id="{prefix}-label"
									value={draft.label}
									oninput={(event) => updateLabel(draft, event.currentTarget.value)}
									placeholder={m.admin_super_account_form_label_placeholder()}
									maxlength={80}
								/>
							</Field.Field>
							<Field.Field>
								<Field.Label for="{prefix}-id">{m.admin_super_account_form_id()}</Field.Label>
								<Input
									id="{prefix}-id"
									value={draft.id}
									oninput={(event) => updateId(draft, event.currentTarget.value)}
									class="font-mono text-xs"
									maxlength={40}
									spellcheck="false"
								/>
							</Field.Field>
							<Field.Field>
								<Field.Label for="{prefix}-type">{m.admin_super_account_form_type()}</Field.Label>
								<Select.Root
									type="single"
									value={draft.type}
									onValueChange={(value) => (draft.type = value as AccountFieldType)}
								>
									<Select.Trigger id="{prefix}-type" class="w-full">
										{typeOptions.find((option) => option.value === draft.type)?.label}
									</Select.Trigger>
									<Select.Content>
										{#each typeOptions as option (option.value)}
											<Select.Item value={option.value} label={option.label}>
												{option.label}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</Field.Field>
							<Field.Field orientation="horizontal" class="items-center self-end pb-2">
								<Switch id="{prefix}-required" bind:checked={draft.required} />
								<Field.Label for="{prefix}-required" class="font-normal">
									{m.admin_super_account_form_required()}
								</Field.Label>
							</Field.Field>
						</div>

						<div class="grid gap-4 sm:grid-cols-2">
							<Field.Field>
								<Field.Label for="{prefix}-placeholder">
									{m.admin_super_account_form_placeholder()}
								</Field.Label>
								<Input id="{prefix}-placeholder" bind:value={draft.placeholder} maxlength={120} />
							</Field.Field>
							<Field.Field>
								<Field.Label for="{prefix}-help">{m.admin_super_account_form_help()}</Field.Label>
								<Input id="{prefix}-help" bind:value={draft.helpText} maxlength={200} />
							</Field.Field>
						</div>

						{#if draft.type === 'select'}
							<Field.Field>
								<Field.Label for="{prefix}-options">
									{m.admin_super_account_form_options()}
								</Field.Label>
								<Textarea
									id="{prefix}-options"
									bind:value={draft.options}
									class="min-h-24"
									placeholder={m.admin_super_account_form_options_placeholder()}
								/>
								<Field.Description>{m.admin_super_account_form_options_hint()}</Field.Description>
							</Field.Field>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</section>

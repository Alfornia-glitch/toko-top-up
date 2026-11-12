<script lang="ts">
	import type { Component } from 'svelte';
	import { AlertTriangle, Package, ScrollText, Trash2 } from '@lucide/svelte';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as AlertDialog from '#lib/frontend/components/ui/alert-dialog/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';

	type DangerAction = 'purge_archived_products' | 'purge_old_audit_logs';

	type DangerItem = {
		key: DangerAction;
		title: string;
		description: string;
		icon: Component<{ class?: string }>;
	};

	const actions: DangerItem[] = [
		{
			key: 'purge_archived_products',
			title: 'Purge archived products',
			description:
				'Permanently delete archived products that have no order references. Products referenced by orders are skipped.',
			icon: Package
		},
		{
			key: 'purge_old_audit_logs',
			title: 'Purge audit logs older than 90 days',
			description: 'Permanently delete audit log entries created more than 90 days ago.',
			icon: ScrollText
		}
	];

	let activeAction = $state<DangerItem | null>(null);
	let dialogOpen = $state(false);
	let confirmText = $state('');
	let running = $state(false);
	let error = $state('');
	let results = $state<Partial<Record<DangerAction, string>>>({});

	const canRun = $derived(confirmText.trim() === 'DELETE');

	function openAction(action: DangerItem) {
		activeAction = action;
		confirmText = '';
		error = '';
		dialogOpen = true;
	}

	async function runAction() {
		const action = activeAction;
		if (!action || !canRun) return;

		running = true;
		error = '';

		try {
			const response = await fetch('/api/admin/super/danger', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: action.key, confirm: 'DELETE' })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Action failed');

			const deleted = Number(payload.data?.deleted ?? 0);
			results[action.key] = `Deleted ${deleted} record${deleted === 1 ? '' : 's'}.`;
			dialogOpen = false;
			activeAction = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Action failed';
		} finally {
			running = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Danger zone</h1>
		<p class="text-sm text-muted-foreground">
			Destructive maintenance actions. These cannot be undone.
		</p>
	</div>

	<div
		class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
	>
		<AlertTriangle class="mt-0.5 size-4 shrink-0" />
		<p>Review each action carefully. Type DELETE in the confirmation dialog to proceed.</p>
	</div>

	{#if error && !dialogOpen}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
		>
			{error}
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		{#each actions as action (action.key)}
			{@const Icon = action.icon}
			<Card.Root class="border-destructive/30">
				<Card.Header class="flex flex-row items-center gap-2 space-y-0">
					<Icon class="size-4 text-destructive" />
					<Card.Title class="text-base">{action.title}</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<p class="text-sm text-muted-foreground">{action.description}</p>
					{#if results[action.key]}
						<p class="text-sm font-medium text-emerald-600 dark:text-emerald-400">
							{results[action.key]}
						</p>
					{/if}
					<Button variant="destructive" onclick={() => openAction(action)}>
						<Trash2 class="size-4" />
						Run action
					</Button>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>

<AlertDialog.Root bind:open={dialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{activeAction?.title ?? 'Confirm action'}</AlertDialog.Title>
			<AlertDialog.Description>
				Type DELETE to confirm. {activeAction?.description ?? ''}
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="grid gap-2">
			<Field.Label for="danger-confirm">Confirmation</Field.Label>
			<Input id="danger-confirm" bind:value={confirmText} placeholder="DELETE" />
		</div>

		{#if error}
			<Field.Error>{error}</Field.Error>
		{/if}

		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<Button
				type="button"
				class="bg-destructive text-white hover:bg-destructive/90"
				disabled={!canRun || running}
				onclick={runAction}
			>
				{running ? 'Running…' : 'Delete'}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

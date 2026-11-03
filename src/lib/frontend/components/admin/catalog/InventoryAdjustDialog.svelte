<script lang="ts" module>
	export type InventoryVariant = {
		id: string;
		name: string;
		sku: string;
		stock: number;
	};
</script>

<script lang="ts">
	import * as Dialog from '#lib/frontend/components/ui/dialog/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';

	let {
		open = $bindable(false),
		variant = null,
		onsaved
	}: {
		open?: boolean;
		variant?: InventoryVariant | null;
		onsaved?: () => void | Promise<void>;
	} = $props();

	let delta = $state('');
	let reason = $state('');
	let referenceType = $state('');
	let referenceId = $state('');
	let saving = $state(false);
	let error = $state('');

	function describeError(payload: {
		error?: string;
		details?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
	}): string {
		const base = payload.error ?? 'Could not adjust stock';
		const messages = [
			...(payload.details?.formErrors ?? []),
			...Object.values(payload.details?.fieldErrors ?? {}).flat()
		];

		return messages.length ? `${base}: ${messages.join(', ')}` : base;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';

		if (!variant) return;

		const amount = Number(delta);
		if (!Number.isInteger(amount) || amount === 0) {
			error = 'Enter a non-zero whole number.';
			return;
		}

		if (!reason.trim()) {
			error = 'Reason is required.';
			return;
		}

		saving = true;

		try {
			const body = {
				variantId: variant.id,
				delta: amount,
				reason: reason.trim(),
				referenceType: referenceType.trim() ? referenceType.trim() : null,
				referenceId: referenceId.trim() ? referenceId.trim() : null
			};
			const response = await fetch('/api/admin/inventory', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(describeError(payload));

			open = false;
			await onsaved?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not adjust stock';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Adjust stock</Dialog.Title>
			<Dialog.Description>
				{#if variant}
					{variant.name} · {variant.sku} · currently {variant.stock} in stock.
				{:else}
					Choose a variant to adjust.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				<Field.Field>
					<Field.Label for="inventory-delta">Change</Field.Label>
					<Input
						id="inventory-delta"
						type="number"
						step="1"
						bind:value={delta}
						placeholder="e.g. 10 or -3"
						required
					/>
					<Field.Description>Use a negative number to remove stock.</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="inventory-reason">Reason</Field.Label>
					<Input
						id="inventory-reason"
						bind:value={reason}
						placeholder="e.g. Stock received"
						required
					/>
				</Field.Field>

				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="inventory-reference-type">Reference type</Field.Label>
						<Input
							id="inventory-reference-type"
							bind:value={referenceType}
							placeholder="e.g. purchase_order"
						/>
					</Field.Field>

					<Field.Field>
						<Field.Label for="inventory-reference-id">Reference ID</Field.Label>
						<Input
							id="inventory-reference-id"
							bind:value={referenceId}
							placeholder="Optional reference"
						/>
					</Field.Field>
				</div>
			</Field.Group>

			{#if error}
				<Field.Error>{error}</Field.Error>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={saving}>
					Cancel
				</Button>
				<Button type="submit" disabled={saving || !variant}>
					{saving ? 'Adjusting…' : 'Adjust stock'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

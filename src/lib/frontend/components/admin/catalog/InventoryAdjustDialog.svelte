<script lang="ts" module>
	export type InventoryVariant = {
		id: string;
		name: string;
		sku: string;
		stock: number;
	};
</script>

<script lang="ts">
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { m } from '#lib/paraglide/messages.js';
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
		const base = errorMessage(payload, 'components_inventory_adjust_failed');
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
			error = m.components_inventory_adjust_delta_invalid();
			return;
		}

		if (!reason.trim()) {
			error = m.components_inventory_adjust_reason_required();
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
			error = errorMessage(err, 'components_inventory_adjust_failed');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{m.components_inventory_adjust_title()}</Dialog.Title>
			<Dialog.Description>
				{#if variant}
					{m.components_inventory_adjust_current({
						name: variant.name,
						sku: variant.sku,
						stock: variant.stock
					})}
				{:else}
					{m.components_inventory_adjust_choose_variant()}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				<Field.Field>
					<Field.Label for="inventory-delta">{m.components_inventory_adjust_change()}</Field.Label>
					<Input
						id="inventory-delta"
						type="number"
						step="1"
						bind:value={delta}
						placeholder={m.components_inventory_adjust_delta_placeholder()}
						required
					/>
					<Field.Description>{m.components_inventory_adjust_delta_hint()}</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="inventory-reason">{m.components_inventory_adjust_reason()}</Field.Label>
					<Input
						id="inventory-reason"
						bind:value={reason}
						placeholder={m.components_inventory_adjust_reason_placeholder()}
						required
					/>
				</Field.Field>

				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="inventory-reference-type"
							>{m.components_inventory_adjust_reference_type()}</Field.Label
						>
						<Input
							id="inventory-reference-type"
							bind:value={referenceType}
							placeholder={m.components_inventory_adjust_reference_type_placeholder()}
						/>
					</Field.Field>

					<Field.Field>
						<Field.Label for="inventory-reference-id"
							>{m.components_inventory_adjust_reference_id()}</Field.Label
						>
						<Input
							id="inventory-reference-id"
							bind:value={referenceId}
							placeholder={m.components_inventory_adjust_reference_id_placeholder()}
						/>
					</Field.Field>
				</div>
			</Field.Group>

			{#if error}
				<Field.Error>{error}</Field.Error>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={saving}>
					{m.common_cancel()}
				</Button>
				<Button type="submit" disabled={saving || !variant}>
					{saving
						? m.components_inventory_adjust_submitting()
						: m.components_inventory_adjust_title()}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

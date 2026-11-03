<script lang="ts" module>
	export type GiftCardRecord = {
		id: string;
		code: string;
		initialAmountCents: number;
		balanceCents: number;
		currency: string;
		status: string;
		recipientName: string | null;
		recipientEmail: string | null;
		message: string | null;
		deliveredAt: string | null;
		expiresAt: string | null;
		createdAt: string;
		updatedAt: string;
	};
</script>

<script lang="ts">
	import * as Dialog from '#lib/frontend/components/ui/dialog/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';

	let {
		open = $bindable(false),
		card = null,
		onsaved
	}: {
		open?: boolean;
		card?: GiftCardRecord | null;
		onsaved?: () => void | Promise<void>;
	} = $props();

	function toDatetimeLocal(value: string | null) {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';

		const pad = (input: number) => String(input).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	function fromDatetimeLocal(value: string) {
		return value ? new Date(value).toISOString() : null;
	}

	function initialForm() {
		const value = card;

		return {
			code: '',
			initialAmount: value ? String(value.initialAmountCents / 100) : '',
			currency: value?.currency ?? 'USD',
			balance: value ? String(value.balanceCents / 100) : '',
			status: value?.status ?? 'active',
			recipientName: value?.recipientName ?? '',
			recipientEmail: value?.recipientEmail ?? '',
			message: value?.message ?? '',
			expiresAt: toDatetimeLocal(value?.expiresAt ?? null)
		};
	}

	const isEdit = $derived(Boolean(card));
	const initial = initialForm();
	let code = $state(initial.code);
	let initialAmount = $state(initial.initialAmount);
	let currency = $state(initial.currency);
	let balance = $state(initial.balance);
	let status = $state(initial.status);
	let recipientName = $state(initial.recipientName);
	let recipientEmail = $state(initial.recipientEmail);
	let message = $state(initial.message);
	let expiresAt = $state(initial.expiresAt);
	let saving = $state(false);
	let error = $state('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';

		const trimmedRecipientName = recipientName.trim();
		const trimmedRecipientEmail = recipientEmail.trim();
		const trimmedMessage = message.trim();
		const expiresAtValue = fromDatetimeLocal(expiresAt);

		if (trimmedRecipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedRecipientEmail)) {
			error = 'Recipient email is not valid.';
			return;
		}

		saving = true;

		try {
			if (isEdit && card) {
				const numericBalance = Number(balance);
				if (!Number.isFinite(numericBalance) || numericBalance < 0) {
					error = 'Balance must be zero or more.';
					return;
				}

				const payload = {
					status,
					balanceCents: Math.round(numericBalance * 100),
					recipientName: trimmedRecipientName || null,
					recipientEmail: trimmedRecipientEmail || null,
					message: trimmedMessage || null,
					expiresAt: expiresAtValue
				};

				const response = await fetch(`/api/admin/gift-cards/${card.id}`, {
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				});
				const result = await response.json().catch(() => ({}));

				if (!response.ok) throw new Error(result.error ?? 'Could not save gift card');
			} else {
				const numericAmount = Number(initialAmount);
				if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
					error = 'Initial amount must be greater than zero.';
					return;
				}

				const trimmedCode = code.trim();
				const trimmedCurrency = currency.trim().toUpperCase() || 'USD';

				const payload = {
					code: trimmedCode || undefined,
					initialAmountCents: Math.round(numericAmount * 100),
					currency: trimmedCurrency,
					recipientName: trimmedRecipientName || null,
					recipientEmail: trimmedRecipientEmail || null,
					message: trimmedMessage || null,
					expiresAt: expiresAtValue
				};

				const response = await fetch('/api/admin/gift-cards', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				});
				const result = await response.json().catch(() => ({}));

				if (!response.ok) throw new Error(result.error ?? 'Could not issue gift card');
			}

			open = false;
			await onsaved?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save gift card';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{isEdit ? 'Edit gift card' : 'Issue gift card'}</Dialog.Title>
			<Dialog.Description>
				{isEdit
					? 'Adjust the balance, status, recipient details and expiry.'
					: 'Create a new gift card with an initial balance.'}
			</Dialog.Description>
		</Dialog.Header>

		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				{#if isEdit && card}
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="gift-card-code">Code</Field.Label>
							<Input id="gift-card-code" value={card.code} readonly />
						</Field.Field>

						<Field.Field>
							<Field.Label for="gift-card-status">Status</Field.Label>
							<Select.Root type="single" bind:value={status}>
								<Select.Trigger id="gift-card-status" class="w-full">
									<Select.Value placeholder="Select status" />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="active" label="Active">Active</Select.Item>
									<Select.Item value="redeemed" label="Redeemed">Redeemed</Select.Item>
									<Select.Item value="expired" label="Expired">Expired</Select.Item>
									<Select.Item value="disabled" label="Disabled">Disabled</Select.Item>
								</Select.Content>
							</Select.Root>
						</Field.Field>
					</div>

					<Field.Field>
						<Field.Label for="gift-card-balance">Balance (dollars)</Field.Label>
						<Input
							id="gift-card-balance"
							type="number"
							min="0"
							step="0.01"
							bind:value={balance}
							required
						/>
						<Field.Description>Converted to cents when saved.</Field.Description>
					</Field.Field>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="gift-card-code">Code</Field.Label>
							<Input
								id="gift-card-code"
								bind:value={code}
								placeholder="Auto-generated when empty"
							/>
						</Field.Field>

						<Field.Field>
							<Field.Label for="gift-card-currency">Currency</Field.Label>
							<Input id="gift-card-currency" bind:value={currency} maxlength={3} required />
						</Field.Field>
					</div>

					<Field.Field>
						<Field.Label for="gift-card-amount">Initial amount (dollars)</Field.Label>
						<Input
							id="gift-card-amount"
							type="number"
							min="0.01"
							step="0.01"
							bind:value={initialAmount}
							placeholder="0.00"
							required
						/>
						<Field.Description>Converted to cents when saved.</Field.Description>
					</Field.Field>
				{/if}

				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="gift-card-recipient-name">Recipient name</Field.Label>
						<Input
							id="gift-card-recipient-name"
							bind:value={recipientName}
							placeholder="Optional"
						/>
					</Field.Field>

					<Field.Field>
						<Field.Label for="gift-card-recipient-email">Recipient email</Field.Label>
						<Input
							id="gift-card-recipient-email"
							type="email"
							bind:value={recipientEmail}
							placeholder="Optional"
						/>
					</Field.Field>
				</div>

				<Field.Field>
					<Field.Label for="gift-card-message">Message</Field.Label>
					<Textarea
						id="gift-card-message"
						bind:value={message}
						placeholder="Optional message to the recipient"
						rows={3}
					/>
				</Field.Field>

				<Field.Field>
					<Field.Label for="gift-card-expires-at">Expires at</Field.Label>
					<Input id="gift-card-expires-at" type="datetime-local" bind:value={expiresAt} />
					<Field.Description>Leave empty for no expiry.</Field.Description>
				</Field.Field>
			</Field.Group>

			{#if error}
				<Field.Error>{error}</Field.Error>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={saving}>
					Cancel
				</Button>
				<Button type="submit" disabled={saving}>
					{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Issue gift card'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

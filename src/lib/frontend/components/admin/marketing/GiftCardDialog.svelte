<script lang="ts" module>
	export type GiftCardRecord = {
		id: string;
		code: string;
		initialAmount: number;
		balance: number;
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
	import { statusLabel } from '#lib/frontend/i18n/index.ts';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { m } from '#lib/paraglide/messages.js';
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
			initialAmount: value ? String(value.initialAmount) : '',
			currency: value?.currency ?? 'IDR',
			balance: value ? String(value.balance) : '',
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
			error = m.components_gift_card_dialog_email_invalid();
			return;
		}

		saving = true;

		try {
			if (isEdit && card) {
				const numericBalance = Number(balance);
				if (!Number.isFinite(numericBalance) || numericBalance < 0) {
					error = m.components_gift_card_dialog_balance_invalid();
					return;
				}

				const payload = {
					status,
					balance: Math.round(numericBalance),
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

				if (!response.ok) {
					throw new Error(errorMessage(result, 'components_gift_card_dialog_save_failed'));
				}
			} else {
				const numericAmount = Number(initialAmount);
				if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
					error = m.components_gift_card_dialog_amount_invalid();
					return;
				}

				const trimmedCode = code.trim();
				const trimmedCurrency = currency.trim().toUpperCase() || 'IDR';

				const payload = {
					code: trimmedCode || undefined,
					initialAmount: Math.round(numericAmount),
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

				if (!response.ok) {
					throw new Error(errorMessage(result, 'components_gift_card_dialog_issue_failed'));
				}
			}

			open = false;
			await onsaved?.();
		} catch (err) {
			error = errorMessage(err, 'components_gift_card_dialog_save_failed');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title
				>{isEdit
					? m.components_gift_card_dialog_edit_title()
					: m.components_gift_card_dialog_issue_title()}</Dialog.Title
			>
			<Dialog.Description>
				{isEdit
					? m.components_gift_card_dialog_edit_description()
					: m.components_gift_card_dialog_issue_description()}
			</Dialog.Description>
		</Dialog.Header>

		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				{#if isEdit && card}
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="gift-card-code">{m.components_form_code()}</Field.Label>
							<Input id="gift-card-code" value={card.code} readonly />
						</Field.Field>

						<Field.Field>
							<Field.Label for="gift-card-status">{m.common_status()}</Field.Label>
							<Select.Root type="single" bind:value={status}>
								<Select.Trigger id="gift-card-status" class="w-full">
									<Select.Value placeholder={m.components_form_select_status()} />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="active" label={statusLabel('gift_card', 'active')}
										>{statusLabel('gift_card', 'active')}</Select.Item
									>
									<Select.Item value="redeemed" label={statusLabel('gift_card', 'redeemed')}
										>{statusLabel('gift_card', 'redeemed')}</Select.Item
									>
									<Select.Item value="expired" label={statusLabel('gift_card', 'expired')}
										>{statusLabel('gift_card', 'expired')}</Select.Item
									>
									<Select.Item value="disabled" label={statusLabel('gift_card', 'disabled')}
										>{statusLabel('gift_card', 'disabled')}</Select.Item
									>
								</Select.Content>
							</Select.Root>
						</Field.Field>
					</div>

					<Field.Field>
						<Field.Label for="gift-card-balance"
							>{m.components_gift_card_dialog_balance()}</Field.Label
						>
						<Input
							id="gift-card-balance"
							type="number"
							min="0"
							step="0.01"
							bind:value={balance}
							required
						/>
						<Field.Description>{m.components_form_whole_rupiah()}</Field.Description>
					</Field.Field>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="gift-card-code">{m.components_form_code()}</Field.Label>
							<Input
								id="gift-card-code"
								bind:value={code}
								placeholder={m.components_gift_card_dialog_code_placeholder()}
							/>
						</Field.Field>

						<Field.Field>
							<Field.Label for="gift-card-currency">{m.components_form_currency()}</Field.Label>
							<Input id="gift-card-currency" bind:value={currency} maxlength={3} required />
						</Field.Field>
					</div>

					<Field.Field>
						<Field.Label for="gift-card-amount"
							>{m.components_gift_card_dialog_initial_amount()}</Field.Label
						>
						<Input
							id="gift-card-amount"
							type="number"
							min="0.01"
							step="0.01"
							bind:value={initialAmount}
							placeholder="0.00"
							required
						/>
						<Field.Description>{m.components_form_whole_rupiah()}</Field.Description>
					</Field.Field>
				{/if}

				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="gift-card-recipient-name"
							>{m.components_gift_card_dialog_recipient_name()}</Field.Label
						>
						<Input
							id="gift-card-recipient-name"
							bind:value={recipientName}
							placeholder={m.common_optional()}
						/>
					</Field.Field>

					<Field.Field>
						<Field.Label for="gift-card-recipient-email"
							>{m.components_gift_card_dialog_recipient_email()}</Field.Label
						>
						<Input
							id="gift-card-recipient-email"
							type="email"
							bind:value={recipientEmail}
							placeholder={m.common_optional()}
						/>
					</Field.Field>
				</div>

				<Field.Field>
					<Field.Label for="gift-card-message"
						>{m.components_gift_card_dialog_message()}</Field.Label
					>
					<Textarea
						id="gift-card-message"
						bind:value={message}
						placeholder={m.components_gift_card_dialog_message_placeholder()}
						rows={3}
					/>
				</Field.Field>

				<Field.Field>
					<Field.Label for="gift-card-expires-at"
						>{m.components_gift_card_dialog_expires_at()}</Field.Label
					>
					<Input id="gift-card-expires-at" type="datetime-local" bind:value={expiresAt} />
					<Field.Description>{m.components_form_no_expiry()}</Field.Description>
				</Field.Field>
			</Field.Group>

			{#if error}
				<Field.Error>{error}</Field.Error>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={saving}>
					{m.common_cancel()}
				</Button>
				<Button type="submit" disabled={saving}>
					{saving
						? m.common_saving()
						: isEdit
							? m.common_save_changes()
							: m.components_gift_card_dialog_issue_title()}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

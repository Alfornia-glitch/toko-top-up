<script lang="ts">
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { untrack } from 'svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Checkbox } from '#lib/frontend/components/ui/checkbox/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';

	interface AddressFormInitial {
		label?: string | null;
		recipientName?: string;
		phone?: string | null;
		line1?: string;
		line2?: string | null;
		city?: string;
		region?: string | null;
		postalCode?: string | null;
		country?: string;
		isDefaultShipping?: boolean;
		isDefaultBilling?: boolean;
	}

	interface AddressFormValue {
		label: string | null;
		recipientName: string;
		phone: string | null;
		line1: string;
		line2: string | null;
		city: string;
		region: string | null;
		postalCode: string | null;
		country: string;
		isDefaultShipping: boolean;
		isDefaultBilling: boolean;
	}

	let {
		initial = {},
		submitting = false,
		submitLabel = m.components_address_form_submit(),
		oncancel,
		onsubmit
	}: {
		initial?: AddressFormInitial;
		submitting?: boolean;
		submitLabel?: string;
		oncancel?: () => void;
		onsubmit: (value: AddressFormValue) => void | Promise<void>;
	} = $props();

	let form = $state(
		untrack(() => ({
			label: initial.label ?? '',
			recipientName: initial.recipientName ?? '',
			phone: initial.phone ?? '',
			line1: initial.line1 ?? '',
			line2: initial.line2 ?? '',
			city: initial.city ?? '',
			region: initial.region ?? '',
			postalCode: initial.postalCode ?? '',
			country: initial.country ?? '',
			isDefaultShipping: initial.isDefaultShipping ?? false,
			isDefaultBilling: initial.isDefaultBilling ?? false
		}))
	);

	let error = $state('');

	function nullable(value: string): string | null {
		const trimmed = value.trim();
		return trimmed ? trimmed : null;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;

		const recipientName = form.recipientName.trim();
		const line1 = form.line1.trim();
		const city = form.city.trim();
		const country = form.country.trim();

		if (!recipientName) {
			error = m.components_address_form_recipient_required();
			return;
		}
		if (!line1) {
			error = m.components_address_form_line1_required();
			return;
		}
		if (!city) {
			error = m.components_address_form_city_required();
			return;
		}
		if (!country) {
			error = m.components_address_form_country_required();
			return;
		}

		error = '';

		try {
			await onsubmit({
				label: nullable(form.label),
				recipientName,
				phone: nullable(form.phone),
				line1,
				line2: nullable(form.line2),
				city,
				region: nullable(form.region),
				postalCode: nullable(form.postalCode),
				country,
				isDefaultShipping: form.isDefaultShipping,
				isDefaultBilling: form.isDefaultBilling
			});
		} catch (cause) {
			error = errorMessage(cause, 'components_address_form_save_failed');
		}
	}
</script>

<form class="flex flex-col gap-4" onsubmit={handleSubmit} oninput={() => (error = '')} novalidate>
	<div class="grid gap-4 sm:grid-cols-2">
		<Field.Field>
			<Field.Label for="address-account-label">{m.components_address_form_label()}</Field.Label>
			<Input
				id="address-account-label"
				bind:value={form.label}
				autocomplete="organization"
				placeholder={m.components_address_form_label_placeholder()}
			/>
		</Field.Field>
		<Field.Field>
			<Field.Label for="address-account-recipient"
				>{m.components_address_form_recipient()}</Field.Label
			>
			<Input
				id="address-account-recipient"
				bind:value={form.recipientName}
				autocomplete="name"
				required
			/>
		</Field.Field>
		<Field.Field>
			<Field.Label for="address-account-phone">{m.common_phone()}</Field.Label>
			<Input id="address-account-phone" bind:value={form.phone} autocomplete="tel" />
		</Field.Field>
		<Field.Field>
			<Field.Label for="address-account-country">{m.components_address_form_country()}</Field.Label>
			<Input
				id="address-account-country"
				bind:value={form.country}
				autocomplete="country-name"
				required
			/>
		</Field.Field>
		<Field.Field class="sm:col-span-2">
			<Field.Label for="address-account-line1">{m.components_address_form_line1()}</Field.Label>
			<Input
				id="address-account-line1"
				bind:value={form.line1}
				autocomplete="address-line1"
				required
			/>
		</Field.Field>
		<Field.Field class="sm:col-span-2">
			<Field.Label for="address-account-line2">{m.components_address_form_line2()}</Field.Label>
			<Input id="address-account-line2" bind:value={form.line2} autocomplete="address-line2" />
		</Field.Field>
		<Field.Field>
			<Field.Label for="address-account-city">{m.components_address_form_city()}</Field.Label>
			<Input
				id="address-account-city"
				bind:value={form.city}
				autocomplete="address-level2"
				required
			/>
		</Field.Field>
		<Field.Field>
			<Field.Label for="address-account-region">{m.components_address_form_region()}</Field.Label>
			<Input id="address-account-region" bind:value={form.region} autocomplete="address-level1" />
		</Field.Field>
		<Field.Field>
			<Field.Label for="address-account-postal">{m.components_address_form_postal()}</Field.Label>
			<Input id="address-account-postal" bind:value={form.postalCode} autocomplete="postal-code" />
		</Field.Field>
	</div>

	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<Checkbox id="address-account-default-shipping" bind:checked={form.isDefaultShipping} />
			<Field.Label for="address-account-default-shipping" class="font-normal">
				{m.components_address_form_default_shipping()}
			</Field.Label>
		</div>
		<div class="flex items-center gap-2">
			<Checkbox id="address-account-default-billing" bind:checked={form.isDefaultBilling} />
			<Field.Label for="address-account-default-billing" class="font-normal">
				{m.components_address_form_default_billing()}
			</Field.Label>
		</div>
	</div>

	{#if error}
		<Field.Error>{error}</Field.Error>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		<Button type="submit" disabled={submitting}>
			{#if submitting}
				<Spinner />
			{/if}
			{submitting ? m.common_saving() : submitLabel}
		</Button>
		{#if oncancel}
			<Button type="button" variant="outline" onclick={oncancel}>{m.common_cancel()}</Button>
		{/if}
	</div>
</form>

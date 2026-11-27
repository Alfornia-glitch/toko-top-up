<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import {
		listAddresses,
		createAddress,
		updateAddress,
		deleteAddress,
		type AddressInput,
		AddressForm,
		EmptyState,
		isUnauthorized
	} from '#lib/frontend/modules/account/index.ts';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { MapPin, Plus } from '@lucide/svelte';
	import AccountPageShell from '#lib/frontend/modules/account/components/AccountPageShell.svelte';
	import * as AlertDialog from '#lib/frontend/components/ui/alert-dialog/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Dialog from '#lib/frontend/components/ui/dialog/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';

	import type { Address } from '#lib/frontend/modules/commerce/models.ts';

	let addresses = $state<Address[]>([]);
	let loading = $state(true);
	let error = $state('');
	let formOpen = $state(false);
	let editing = $state<Address | null>(null);
	let saving = $state(false);
	let deletingId = $state<string | null>(null);

	function redirectToLogin(): void {
		const target = `${page.url.pathname}${page.url.search}`;
		void goto(`/login?redirectTo=${encodeURIComponent(target)}`, { replaceState: true });
	}

	function failureMessage(cause: unknown): string {
		if (isUnauthorized(cause)) {
			redirectToLogin();
			return '';
		}

		return errorMessage(cause, 'common_something_went_wrong');
	}

	async function loadAddresses(): Promise<void> {
		loading = true;
		error = '';

		try {
			addresses = await listAddresses();
		} catch (cause) {
			error = failureMessage(cause);
		} finally {
			loading = false;
		}
	}

	function startAdd(): void {
		editing = null;
		formOpen = true;
	}

	function startEdit(address: Address): void {
		editing = address;
		formOpen = true;
	}

	function closeForm(): void {
		formOpen = false;
		editing = null;
	}

	async function submitForm(value: AddressInput): Promise<void> {
		saving = true;

		try {
			if (editing) {
				await updateAddress(editing.id, value);
			} else {
				await createAddress(value);
			}

			closeForm();
			await loadAddresses();
		} catch (cause) {
			if (isUnauthorized(cause)) {
				redirectToLogin();
				return;
			}

			throw new Error(errorMessage(cause, 'account_addresses_save_failed'));
		} finally {
			saving = false;
		}
	}

	async function makeDefault(address: Address): Promise<void> {
		error = '';

		try {
			await updateAddress(address.id, {
				label: address.label,
				recipientName: address.recipientName,
				phone: address.phone,
				line1: address.line1,
				line2: address.line2,
				city: address.city,
				region: address.region,
				postalCode: address.postalCode,
				country: address.country,
				isDefaultShipping: true,
				isDefaultBilling: address.isDefaultBilling
			});
			await loadAddresses();
		} catch (cause) {
			error = failureMessage(cause);
		}
	}

	function requestDelete(address: Address): void {
		deletingId = address.id;
	}

	async function confirmDelete(): Promise<void> {
		const id = deletingId;
		if (!id) return;

		deletingId = null;
		error = '';

		try {
			await deleteAddress(id);
			await loadAddresses();
		} catch (cause) {
			error = failureMessage(cause);
		}
	}

	onMount(() => {
		void loadAddresses();
	});
</script>

<AccountPageShell
	title={m.account_addresses_title()}
	description={m.account_addresses_description()}
>
	{#snippet actions()}
		<Button onclick={startAdd}>
			<Plus class="size-4" />
			{m.account_addresses_add()}
		</Button>
	{/snippet}

	{#if loading}
		<div class="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-live="polite">
			<Skeleton class="h-52 w-full rounded-xl" />
			<Skeleton class="h-52 w-full rounded-xl" />
		</div>
	{:else if error && addresses.length === 0}
		<div
			class="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			role="alert"
		>
			{error}
		</div>
	{:else if addresses.length === 0}
		<EmptyState
			title={m.account_addresses_empty_title()}
			description={m.account_addresses_empty_description()}
		>
			{#snippet icon()}
				<MapPin class="size-6" />
			{/snippet}
			{#snippet action()}
				<Button onclick={startAdd}>{m.account_addresses_add_first()}</Button>
			{/snippet}
		</EmptyState>
	{:else}
		{#if error}
			<div
				class="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				role="alert"
			>
				{error}
			</div>
		{/if}

		<div class="grid gap-4 sm:grid-cols-2">
			{#each addresses as address (address.id)}
				<Card.Root>
					<Card.Header>
						{#if address.label}
							<Badge variant="outline">{address.label}</Badge>
						{/if}
						<Card.Title>{address.recipientName}</Card.Title>
						{#if address.phone}
							<Card.Description>{address.phone}</Card.Description>
						{/if}
					</Card.Header>
					<Card.Content class="flex flex-col gap-3">
						<address class="text-sm leading-relaxed text-muted-foreground not-italic">
							<p>{address.line1}</p>
							{#if address.line2}
								<p>{address.line2}</p>
							{/if}
							<p>
								{[address.city, address.region, address.postalCode, address.country]
									.filter(Boolean)
									.join(', ')}
							</p>
						</address>
						{#if address.isDefaultShipping || address.isDefaultBilling}
							<div class="flex flex-wrap items-center gap-2">
								{#if address.isDefaultShipping}
									<Badge variant="secondary">{m.account_addresses_default_shipping()}</Badge>
								{/if}
								{#if address.isDefaultBilling}
									<Badge variant="secondary">{m.account_addresses_default_billing()}</Badge>
								{/if}
							</div>
						{/if}
					</Card.Content>
					<Card.Footer class="flex flex-wrap items-center gap-2">
						<Button variant="outline" size="sm" onclick={() => startEdit(address)}
							>{m.common_edit()}</Button
						>
						<Button variant="ghost" size="sm" onclick={() => requestDelete(address)}
							>{m.common_delete()}</Button
						>
						<Button
							variant="secondary"
							size="sm"
							disabled={address.isDefaultShipping}
							onclick={() => makeDefault(address)}
						>
							{m.account_addresses_make_default()}
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</AccountPageShell>

<Dialog.Root bind:open={formOpen}>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title
				>{editing ? m.account_addresses_edit_title() : m.account_addresses_add()}</Dialog.Title
			>
			<Dialog.Description>
				{editing ? m.account_addresses_edit_description() : m.account_addresses_add_description()}
			</Dialog.Description>
		</Dialog.Header>
		{#key editing?.id ?? 'new'}
			<AddressForm
				initial={editing ?? {}}
				submitting={saving}
				submitLabel={editing ? m.common_save_changes() : m.account_addresses_add()}
				oncancel={closeForm}
				onsubmit={submitForm}
			/>
		{/key}
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root
	open={deletingId !== null}
	onOpenChange={(open) => {
		if (!open) deletingId = null;
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.account_addresses_delete_title()}</AlertDialog.Title>
			<AlertDialog.Description>
				{m.account_addresses_delete_description()}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{m.common_cancel()}</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-white hover:bg-destructive/90"
				onclick={confirmDelete}
			>
				{m.common_delete()}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

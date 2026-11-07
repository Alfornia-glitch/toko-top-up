<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { MapPin, Plus } from '@lucide/svelte';
	import {
		AccountPageShell,
		AddressForm,
		EmptyState
	} from '#lib/frontend/components/account/index.ts';
	import * as AlertDialog from '#lib/frontend/components/ui/alert-dialog/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Dialog from '#lib/frontend/components/ui/dialog/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { api, ApiError, unwrap } from '#lib/frontend/modules/shared/http.ts';
	import type { Address } from '#lib/frontend/modules/commerce/models.ts';

	type AddressesPayload = { data: Address[] };
	type AddressPayload = { data: Address };

	type AddressInput = {
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
	};

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
		if (cause instanceof ApiError && cause.status === 401) {
			redirectToLogin();
			return '';
		}

		return cause instanceof Error ? cause.message : 'Something went wrong';
	}

	async function loadAddresses(): Promise<void> {
		loading = true;
		error = '';

		try {
			addresses = unwrap(await api.get<AddressesPayload>('/api/addresses'));
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
				await api.patch<AddressPayload>(`/api/addresses/${editing.id}`, value);
			} else {
				await api.post<AddressPayload>('/api/addresses', value);
			}

			closeForm();
			await loadAddresses();
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 401) {
				redirectToLogin();
				return;
			}

			throw cause instanceof Error ? cause : new Error('Could not save the address');
		} finally {
			saving = false;
		}
	}

	async function makeDefault(address: Address): Promise<void> {
		error = '';

		try {
			await api.patch<AddressPayload>(`/api/addresses/${address.id}`, {
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
			await api.delete(`/api/addresses/${id}`);
			await loadAddresses();
		} catch (cause) {
			error = failureMessage(cause);
		}
	}

	onMount(() => {
		void loadAddresses();
	});
</script>

<AccountPageShell title="My addresses" description="Manage delivery and billing addresses.">
	{#snippet actions()}
		<Button onclick={startAdd}>
			<Plus class="size-4" />
			Add address
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
			title="No saved addresses"
			description="Add a delivery or billing address to make checkout faster."
		>
			{#snippet icon()}
				<MapPin class="size-6" />
			{/snippet}
			{#snippet action()}
				<Button onclick={startAdd}>Add your first address</Button>
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
									<Badge variant="secondary">Default shipping</Badge>
								{/if}
								{#if address.isDefaultBilling}
									<Badge variant="secondary">Default billing</Badge>
								{/if}
							</div>
						{/if}
					</Card.Content>
					<Card.Footer class="flex flex-wrap items-center gap-2">
						<Button variant="outline" size="sm" onclick={() => startEdit(address)}>Edit</Button>
						<Button variant="ghost" size="sm" onclick={() => requestDelete(address)}>Delete</Button>
						<Button
							variant="secondary"
							size="sm"
							disabled={address.isDefaultShipping}
							onclick={() => makeDefault(address)}
						>
							Make default
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
			<Dialog.Title>{editing ? 'Edit address' : 'Add address'}</Dialog.Title>
			<Dialog.Description>
				{editing
					? 'Update the details for this saved address.'
					: 'Add a delivery or billing address to your account.'}
			</Dialog.Description>
		</Dialog.Header>
		{#key editing?.id ?? 'new'}
			<AddressForm
				initial={editing ?? {}}
				submitting={saving}
				submitLabel={editing ? 'Save changes' : 'Add address'}
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
			<AlertDialog.Title>Delete address</AlertDialog.Title>
			<AlertDialog.Description>
				This will permanently delete this saved address. This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-white hover:bg-destructive/90"
				onclick={confirmDelete}
			>
				Delete
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

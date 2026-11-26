<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { CircleAlert, CircleCheck, Clock, ImageUp, TriangleAlert } from '@lucide/svelte';
	import AccountPageShell from '#lib/frontend/modules/account/components/AccountPageShell.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { api, ApiError, unwrap } from '#lib/frontend/modules/shared/http.ts';

	interface Payment {
		id: string;
		orderId: string;
		baseAmount: number;
		uniqueCode: number;
		totalAmount: number;
		status: 'pending_payment' | 'awaiting_verification' | 'paid' | 'rejected' | 'expired';
		expiresAt: string;
		paidAt: string | null;
		qrisImageUrl: string | null;
		rejectReason: string | null;
		rejectNote: string | null;
		hasProof: boolean;
	}

	function rejectionReason(reason: string | null): string {
		switch (reason) {
			case 'wrong_amount':
				return m.account_payment_detail_reason_wrong_amount();
			case 'unreadable':
				return m.account_payment_detail_reason_unreadable();
			case 'no_matching_mutation':
				return m.account_payment_detail_reason_no_match();
			default:
				return m.account_payment_detail_reason_other();
		}
	}

	const MAX_BYTES = 5 * 1024 * 1024;
	const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

	const id = $derived((page.params as { id?: string }).id ?? '');

	let payment = $state<Payment | null>(null);
	let loading = $state(true);
	let error = $state('');
	let uploadError = $state('');
	let uploading = $state(false);
	let file = $state<File | null>(null);
	let preview = $state('');
	let now = $state(Date.now());

	const remainingMs = $derived(payment ? new Date(payment.expiresAt).getTime() - now : 0);
	const canUpload = $derived(
		payment !== null &&
			(payment.status === 'pending_payment' || payment.status === 'rejected') &&
			remainingMs > 0
	);
	const countdown = $derived.by(() => {
		const total = Math.max(0, Math.floor(remainingMs / 1000));
		const minutes = String(Math.floor(total / 60)).padStart(2, '0');
		const seconds = String(total % 60).padStart(2, '0');
		return `${minutes}:${seconds}`;
	});

	async function load(silent = false) {
		if (!silent) loading = true;
		error = '';

		try {
			payment = unwrap(await api.get<{ data: Payment }>('/api/payments/' + encodeURIComponent(id)));
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 401) {
				await goto('/login?redirectTo=' + encodeURIComponent(page.url.pathname));
				return;
			}
			if (!silent) {
				error =
					cause instanceof ApiError && cause.status === 404
						? m.account_payment_detail_not_found()
						: errorMessage(cause, 'account_payment_detail_load_failed');
			}
		} finally {
			loading = false;
		}
	}

	function choose(event: Event) {
		uploadError = '';
		const input = event.currentTarget as HTMLInputElement;
		const picked = input.files?.[0] ?? null;

		if (preview) URL.revokeObjectURL(preview);
		preview = '';
		file = null;
		if (!picked) return;

		if (!TYPES.includes(picked.type)) {
			uploadError = m.account_payment_detail_type_invalid();
			input.value = '';
			return;
		}
		if (picked.size > MAX_BYTES) {
			uploadError = m.account_payment_detail_size_invalid();
			input.value = '';
			return;
		}

		file = picked;
		preview = URL.createObjectURL(picked);
	}

	async function upload() {
		if (!file || !payment) return;
		uploading = true;
		uploadError = '';

		try {
			const form = new FormData();
			form.append('proof', file);
			const response = await fetch(`/api/payments/${encodeURIComponent(payment.id)}/proof`, {
				method: 'POST',
				body: form
			});
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(errorMessage(body, 'account_payment_detail_upload_failed'));

			payment = body.data as Payment;
			if (preview) URL.revokeObjectURL(preview);
			preview = '';
			file = null;
		} catch (cause) {
			uploadError =
				cause instanceof Error ? cause.message : m.account_payment_detail_upload_failed();
		} finally {
			uploading = false;
		}
	}

	onMount(() => {
		void load();
		const tick = setInterval(() => (now = Date.now()), 1000);
		// Keep the status fresh while an admin reviews the proof.
		const poll = setInterval(() => {
			if (payment?.status === 'awaiting_verification' || payment?.status === 'pending_payment') {
				void load(true);
			}
		}, 15000);

		return () => {
			clearInterval(tick);
			clearInterval(poll);
			if (preview) URL.revokeObjectURL(preview);
		};
	});
</script>

<AccountPageShell
	title={m.account_payment_detail_title()}
	description={m.account_payment_detail_description()}
	narrow
>
	{#if loading}
		<Card.Root>
			<Card.Content class="flex flex-col gap-4 p-6">
				<Skeleton class="h-8 w-48" />
				<Skeleton class="h-64 w-64" />
				<Skeleton class="h-10 w-full" />
			</Card.Content>
		</Card.Root>
	{:else if error}
		<Card.Root>
			<Card.Content class="flex flex-col items-start gap-3 p-6">
				<p class="flex items-center gap-2 text-sm text-destructive" role="alert">
					<CircleAlert class="size-4" aria-hidden="true" />
					{error}
				</p>
				<Button variant="outline" onclick={() => load()}>{m.common_retry()}</Button>
			</Card.Content>
		</Card.Root>
	{:else if payment}
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.account_payment_detail_amount()}</Card.Title>
				<Card.Description>
					{m.account_payment_detail_amount_hint({ uniqueCode: payment.uniqueCode })}
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-5">
				<p class="text-4xl font-bold tracking-tight text-foreground" aria-live="polite">
					{formatMoney(payment.totalAmount, 'IDR')}
				</p>

				{#if payment.status === 'paid'}
					<p class="flex items-center gap-2 text-sm font-medium text-emerald-700" role="status">
						<CircleCheck class="size-4" aria-hidden="true" />
						{m.account_payment_detail_confirmed()}
					</p>
					<Button href="/account/orders">{m.account_payment_detail_view_orders()}</Button>
				{:else if payment.status === 'expired' || (canUpload === false && payment.status === 'pending_payment')}
					<p class="flex items-center gap-2 text-sm text-destructive" role="alert">
						<Clock class="size-4" aria-hidden="true" />
						{m.account_payment_detail_expired()}
					</p>
					<Button href="/">{m.account_payment_detail_back_to_shop()}</Button>
				{:else if payment.status === 'awaiting_verification'}
					<p class="flex items-center gap-2 text-sm text-foreground" role="status">
						<Spinner />
						{m.account_payment_detail_reviewing()}
					</p>
				{:else}
					{#if payment.status === 'rejected'}
						<p class="flex items-start gap-2 text-sm text-destructive" role="alert">
							<CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
							<span>
								{m.account_payment_detail_rejected({
									reason: rejectionReason(payment.rejectReason)
								})}
								{#if payment.rejectNote}
									<em class="block">“{payment.rejectNote}”</em>
								{/if}
								{m.account_payment_detail_reupload()}
							</span>
						</p>
					{/if}

					<div
						class="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
					>
						<TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<p>
							{m.account_payment_detail_exact_warning()}
						</p>
					</div>

					<p class="flex items-center gap-2 text-sm text-muted-foreground">
						<Clock class="size-4" aria-hidden="true" />
						{m.account_payment_detail_time_left()}
						<span class="font-mono font-semibold text-foreground">{countdown}</span>
					</p>

					{#if payment.qrisImageUrl}
						<img
							loading="lazy"
							decoding="async"
							src={payment.qrisImageUrl}
							alt={m.account_payment_detail_qris_alt()}
							class="size-64 rounded-lg border bg-white object-contain p-2"
						/>
					{:else}
						<p class="text-sm text-destructive" role="alert">
							{m.account_payment_detail_qris_missing()}
						</p>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>

		{#if canUpload}
			<Card.Root>
				<Card.Header>
					<Card.Title>{m.account_payment_detail_upload_title()}</Card.Title>
					<Card.Description>
						{m.account_payment_detail_upload_description()}
					</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-4">
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onchange={choose}
						disabled={uploading}
						class="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
						aria-label={m.account_payment_detail_proof_label()}
					/>

					{#if preview}
						<img
							loading="lazy"
							decoding="async"
							src={preview}
							alt={m.account_payment_detail_preview_alt()}
							class="max-h-80 rounded-lg border object-contain"
						/>
					{/if}

					{#if uploadError}
						<p class="text-sm text-destructive" role="alert">{uploadError}</p>
					{/if}

					<Button disabled={!file || uploading} onclick={upload}>
						{#if uploading}
							<Spinner />
						{:else}
							<ImageUp class="size-4" aria-hidden="true" />
						{/if}
						{uploading ? m.account_payment_detail_uploading() : m.account_payment_detail_submit()}
					</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</AccountPageShell>

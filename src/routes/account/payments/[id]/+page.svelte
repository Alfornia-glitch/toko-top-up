<script lang="ts">
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

	const REASONS: Record<string, string> = {
		wrong_amount: 'The amount paid did not match the exact total.',
		unreadable: 'The proof image could not be read.',
		no_matching_mutation: 'We could not find a matching payment in our account.',
		other: 'The proof could not be accepted.'
	};

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
						? 'We could not find this payment.'
						: cause instanceof Error
							? cause.message
							: 'Could not load this payment.';
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
			uploadError = 'Choose a JPG, PNG or WebP image.';
			input.value = '';
			return;
		}
		if (picked.size > MAX_BYTES) {
			uploadError = 'The image must be 5 MB or smaller.';
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
			if (!response.ok) throw new Error(body?.error ?? 'Upload failed');

			payment = body.data as Payment;
			if (preview) URL.revokeObjectURL(preview);
			preview = '';
			file = null;
		} catch (cause) {
			uploadError = cause instanceof Error ? cause.message : 'Upload failed';
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
	title="Pay with QRIS"
	description="Scan, pay the exact amount, then upload your proof."
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
				<Button variant="outline" onclick={() => load()}>Try again</Button>
			</Card.Content>
		</Card.Root>
	{:else if payment}
		<Card.Root>
			<Card.Header>
				<Card.Title>Amount to pay</Card.Title>
				<Card.Description>
					Pay exactly this amount, including the last digits ({payment.uniqueCode}).
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-5">
				<p class="text-4xl font-bold tracking-tight text-foreground" aria-live="polite">
					{formatMoney(payment.totalAmount, 'IDR')}
				</p>

				{#if payment.status === 'paid'}
					<p class="flex items-center gap-2 text-sm font-medium text-emerald-700" role="status">
						<CircleCheck class="size-4" aria-hidden="true" />
						Payment confirmed. Thank you!
					</p>
					<Button href="/account/orders">View my orders</Button>
				{:else if payment.status === 'expired' || (canUpload === false && payment.status === 'pending_payment')}
					<p class="flex items-center gap-2 text-sm text-destructive" role="alert">
						<Clock class="size-4" aria-hidden="true" />
						This payment window has expired and the order was cancelled. Please place a new order.
					</p>
					<Button href="/">Back to shop</Button>
				{:else if payment.status === 'awaiting_verification'}
					<p class="flex items-center gap-2 text-sm text-foreground" role="status">
						<Spinner />
						Your proof is under review. This page updates automatically.
					</p>
				{:else}
					{#if payment.status === 'rejected'}
						<p class="flex items-start gap-2 text-sm text-destructive" role="alert">
							<CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
							<span>
								Your proof was rejected: {REASONS[payment.rejectReason ?? 'other'] ?? REASONS.other}
								{#if payment.rejectNote}
									<em class="block">“{payment.rejectNote}”</em>
								{/if}
								Please upload a new proof while time remains.
							</span>
						</p>
					{/if}

					<div
						class="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
					>
						<TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<p>
							The amount must match exactly. A different amount cannot be matched to your order and
							will be rejected.
						</p>
					</div>

					<p class="flex items-center gap-2 text-sm text-muted-foreground">
						<Clock class="size-4" aria-hidden="true" />
						Time left: <span class="font-mono font-semibold text-foreground">{countdown}</span>
					</p>

					{#if payment.qrisImageUrl}
						<img
							loading="lazy"
							decoding="async"
							src={payment.qrisImageUrl}
							alt="Merchant QRIS code"
							class="size-64 rounded-lg border bg-white object-contain p-2"
						/>
					{:else}
						<p class="text-sm text-destructive" role="alert">
							The QRIS code is not available right now. Please contact support.
						</p>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>

		{#if canUpload}
			<Card.Root>
				<Card.Header>
					<Card.Title>Upload payment proof</Card.Title>
					<Card.Description>
						A screenshot of your successful payment (JPG, PNG or WebP, up to 5 MB).
					</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-4">
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onchange={choose}
						disabled={uploading}
						class="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
						aria-label="Payment proof image"
					/>

					{#if preview}
						<img
							loading="lazy"
							decoding="async"
							src={preview}
							alt="Preview of your proof"
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
						{uploading ? 'Uploading...' : 'Submit proof'}
					</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</AccountPageShell>

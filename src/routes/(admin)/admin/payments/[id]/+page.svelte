<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { ArrowLeft, LoaderCircle } from '@lucide/svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Checkbox } from '#lib/frontend/components/ui/checkbox/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';

	type Detail = {
		payment: {
			id: string;
			orderId: string;
			baseAmount: number;
			uniqueCode: number;
			totalAmount: number;
			status: string;
			expiresAt: string;
			paidAt: string | null;
			createdAt: string;
		};
		customer: { id: string; name: string | null; email: string | null };
		order: { orderNumber: string; status: string; currency: string };
		proofs: Array<{
			id: string;
			uploadedAt: string;
			reviewStatus: string;
			rejectReason: string | null;
			rejectNote: string | null;
		}>;
		audit: Array<{
			id: string;
			actorId: string | null;
			action: string;
			note: string | null;
			createdAt: string;
		}>;
	};

	const REASONS = [
		{ value: 'wrong_amount', label: 'Wrong amount' },
		{ value: 'unreadable', label: 'Proof unreadable' },
		{ value: 'no_matching_mutation', label: 'No matching mutation' },
		{ value: 'other', label: 'Other' }
	];

	const id = $derived((page.params as { id?: string }).id ?? '');

	let detail = $state<Detail | null>(null);
	let loading = $state(true);
	let error = $state('');
	let actionError = $state('');
	let busy = $state(false);
	let checked = $state(false);
	let reason = $state('wrong_amount');
	let note = $state('');
	let proofFailed = $state(false);

	const awaiting = $derived(detail?.payment.status === 'awaiting_verification');
	const latestProof = $derived(detail?.proofs[0] ?? null);

	onMount(() => void load());

	async function load() {
		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/admin/payments/${encodeURIComponent(id)}`);
			const payload = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(payload.error ?? 'Could not load payment');
			detail = payload.data;
			checked = false;
			proofFailed = false;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not load payment';
		} finally {
			loading = false;
		}
	}

	async function decide(action: 'approve' | 'reject') {
		busy = true;
		actionError = '';

		try {
			const response = await fetch(`/api/admin/payments/${encodeURIComponent(id)}/${action}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: action === 'reject' ? JSON.stringify({ reason, note: note || null }) : undefined
			});
			const payload = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(payload.error ?? `Could not ${action} payment`);
			note = '';
			await load();
		} catch (cause) {
			actionError = cause instanceof Error ? cause.message : `Could not ${action} payment`;
		} finally {
			busy = false;
		}
	}

	function formatDate(value: string | null) {
		if (!value) return '—';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(value));
	}
</script>

<div class="space-y-6">
	<div class="flex items-center gap-3">
		<Button variant="outline" size="sm" href="/admin/payments">
			<ArrowLeft class="size-4" /> Queue
		</Button>
		<h1 class="text-2xl font-semibold tracking-tight">Payment review</h1>
	</div>

	{#if loading}
		<Skeleton class="h-64 w-full" />
	{:else if error}
		<div class="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm" role="alert">
			<p class="text-destructive">{error}</p>
			<Button class="mt-3" variant="outline" onclick={load}>Retry</Button>
		</div>
	{:else if detail}
		<div class="grid gap-6 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						Proof <StatusBadge status={detail.payment.status} />
					</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if latestProof && !proofFailed}
						<img
							src={`/api/admin/payments/${encodeURIComponent(id)}/proof?proofId=${latestProof.id}`}
							alt="Payment proof uploaded by the customer"
							class="max-h-[32rem] w-full rounded-lg border object-contain"
							onerror={() => (proofFailed = true)}
						/>
					{:else if proofFailed}
						<p class="text-sm text-destructive" role="alert">
							The proof image could not be loaded.
						</p>
					{:else}
						<p class="text-sm text-muted-foreground">No proof has been uploaded yet.</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<div class="space-y-6">
				<Card.Root>
					<Card.Header><Card.Title>Order</Card.Title></Card.Header>
					<Card.Content class="space-y-2 text-sm">
						<p class="text-3xl font-bold tracking-tight">
							{formatMoney(detail.payment.totalAmount, 'IDR')}
						</p>
						<p class="text-muted-foreground">
							Base {formatMoney(detail.payment.baseAmount, 'IDR')} + code {detail.payment
								.uniqueCode}
						</p>
						<p>
							Order
							<a
								class="font-medium hover:underline"
								href={`/admin/orders/${detail.payment.orderId}`}
							>
								{detail.order.orderNumber}
							</a>
							· {detail.order.status}
						</p>
						<p>{detail.customer.name ?? 'Customer'} · {detail.customer.email ?? '—'}</p>
						<p class="text-muted-foreground">Expires {formatDate(detail.payment.expiresAt)}</p>
					</Card.Content>
				</Card.Root>

				{#if awaiting}
					<Card.Root>
						<Card.Header><Card.Title>Decision</Card.Title></Card.Header>
						<Card.Content class="space-y-5">
							<div class="flex items-start gap-2">
								<Checkbox id="mutation-checked" bind:checked />
								<Label for="mutation-checked" class="leading-snug">
									I checked the bank mutation for this exact amount ({formatMoney(
										detail.payment.totalAmount,
										'IDR'
									)})
								</Label>
							</div>
							<Button disabled={!checked || busy} onclick={() => decide('approve')}>
								{#if busy}<LoaderCircle class="size-4 animate-spin" />{/if}
								Approve payment
							</Button>

							<hr />

							<div class="space-y-1.5">
								<Label for="reject-reason">Reject reason</Label>
								<Select.Root type="single" bind:value={reason}>
									<Select.Trigger id="reject-reason" class="w-full">
										{REASONS.find((r) => r.value === reason)?.label ?? 'Choose a reason'}
									</Select.Trigger>
									<Select.Content>
										{#each REASONS as option (option.value)}
											<Select.Item value={option.value} label={option.label}>
												{option.label}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
							<div class="space-y-1.5">
								<Label for="reject-note">Note (optional, shown to the customer)</Label>
								<Textarea id="reject-note" bind:value={note} maxlength={500} />
							</div>
							<Button variant="destructive" disabled={busy} onclick={() => decide('reject')}>
								Reject proof
							</Button>

							{#if actionError}
								<p class="text-sm text-destructive" role="alert">{actionError}</p>
							{/if}
						</Card.Content>
					</Card.Root>
				{/if}

				<Card.Root>
					<Card.Header><Card.Title>Audit log</Card.Title></Card.Header>
					<Card.Content>
						{#if detail.audit.length === 0}
							<p class="text-sm text-muted-foreground">No activity yet.</p>
						{:else}
							<ol class="space-y-2 text-sm">
								{#each detail.audit as entry (entry.id)}
									<li class="flex flex-wrap justify-between gap-2">
										<span>
											<strong>{entry.action.replaceAll('_', ' ')}</strong>
											{#if entry.note}· {entry.note}{/if}
										</span>
										<span class="text-muted-foreground">{formatDate(entry.createdAt)}</span>
									</li>
								{/each}
							</ol>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	{/if}
</div>

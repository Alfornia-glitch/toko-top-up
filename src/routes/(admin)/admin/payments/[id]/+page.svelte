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
	import { formatDateTime, formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { auditActionLabel, errorMessage, statusLabel } from '#lib/frontend/i18n/index.ts';

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

	const REASONS = $derived([
		{ value: 'wrong_amount', label: m.admin_ops_payment_reason_wrong_amount() },
		{ value: 'unreadable', label: m.admin_ops_payment_reason_unreadable() },
		{ value: 'no_matching_mutation', label: m.admin_ops_payment_reason_no_matching_mutation() },
		{ value: 'other', label: m.admin_ops_payment_reason_other() }
	]);

	function auditLabel(action: string): string {
		switch (action) {
			case 'created':
				return m.admin_ops_payment_audit_created();
			case 'proof_uploaded':
				return m.admin_ops_payment_audit_proof_uploaded();
			case 'approved':
				return m.admin_ops_payment_audit_approved();
			case 'rejected':
				return m.admin_ops_payment_audit_rejected();
			case 'expired':
				return m.admin_ops_payment_audit_expired();
			default:
				return auditActionLabel(action);
		}
	}

	function reasonLabel(code: string): string | null {
		switch (code) {
			case 'wrong_amount':
				return m.admin_ops_payment_reason_wrong_amount();
			case 'unreadable':
				return m.admin_ops_payment_reason_unreadable();
			case 'no_matching_mutation':
				return m.admin_ops_payment_reason_no_matching_mutation();
			case 'other':
				return m.admin_ops_payment_reason_other();
			default:
				return null;
		}
	}

	/** Audit notes are either a bare reason code or `code: free text`. */
	function auditNote(note: string): string {
		const sep = note.indexOf(': ');
		const code = sep === -1 ? note : note.slice(0, sep);
		const label = reasonLabel(code);
		if (!label) return note;
		return sep === -1 ? label : `${label}: ${note.slice(sep + 2)}`;
	}

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
			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_payment_load_failed'));
			detail = payload.data;
			checked = false;
			proofFailed = false;
		} catch (cause) {
			error = errorMessage(cause, 'admin_ops_payment_load_failed');
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
			if (!response.ok)
				throw new Error(
					errorMessage(
						payload,
						action === 'approve'
							? 'admin_ops_payment_approve_failed'
							: 'admin_ops_payment_reject_failed'
					)
				);
			note = '';
			await load();
		} catch (cause) {
			actionError = errorMessage(
				cause,
				action === 'approve'
					? 'admin_ops_payment_approve_failed'
					: 'admin_ops_payment_reject_failed'
			);
		} finally {
			busy = false;
		}
	}

	function formatDate(value: string | null) {
		return formatDateTime(value) || '—';
	}
</script>

<div class="space-y-6">
	<div class="flex items-center gap-3">
		<Button variant="outline" size="sm" href="/admin/payments">
			<ArrowLeft class="size-4" />
			{m.admin_ops_payment_queue()}
		</Button>
		<h1 class="text-2xl font-semibold tracking-tight">{m.admin_ops_payment_review()}</h1>
	</div>

	{#if loading}
		<Skeleton class="h-64 w-full" />
	{:else if error}
		<div class="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm" role="alert">
			<p class="text-destructive">{error}</p>
			<Button class="mt-3" variant="outline" onclick={load}>{m.common_retry()}</Button>
		</div>
	{:else if detail}
		<div class="grid gap-6 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						{m.admin_ops_payment_proof()}
						<StatusBadge kind="payment" status={detail.payment.status} />
					</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if latestProof && !proofFailed}
						<img
							src={`/api/admin/payments/${encodeURIComponent(id)}/proof?proofId=${latestProof.id}`}
							alt={m.admin_ops_payment_proof_alt()}
							class="max-h-[32rem] w-full rounded-lg border object-contain"
							onerror={() => (proofFailed = true)}
						/>
					{:else if proofFailed}
						<p class="text-sm text-destructive" role="alert">
							{m.admin_ops_payment_proof_failed()}
						</p>
					{:else}
						<p class="text-sm text-muted-foreground">{m.admin_ops_payment_no_proof()}</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<div class="space-y-6">
				<Card.Root>
					<Card.Header><Card.Title>{m.common_order()}</Card.Title></Card.Header>
					<Card.Content class="space-y-2 text-sm">
						<p class="text-3xl font-bold tracking-tight">
							{formatMoney(detail.payment.totalAmount, 'IDR')}
						</p>
						<p class="text-muted-foreground">
							{m.admin_ops_payment_base_code({
								base: formatMoney(detail.payment.baseAmount, 'IDR'),
								code: detail.payment.uniqueCode
							})}
						</p>
						<p>
							{m.common_order()}
							<a
								class="font-medium hover:underline"
								href={`/admin/orders/${detail.payment.orderId}`}
							>
								{detail.order.orderNumber}
							</a>
							· {statusLabel('order', detail.order.status)}
						</p>
						<p>
							{detail.customer.name ?? m.admin_ops_payment_customer_fallback()} · {detail.customer
								.email ?? '—'}
						</p>
						<p class="text-muted-foreground">
							{m.admin_ops_payment_expires({ date: formatDate(detail.payment.expiresAt) })}
						</p>
					</Card.Content>
				</Card.Root>

				{#if awaiting}
					<Card.Root>
						<Card.Header><Card.Title>{m.admin_ops_payment_decision()}</Card.Title></Card.Header>
						<Card.Content class="space-y-5">
							<div class="flex items-start gap-2">
								<Checkbox id="mutation-checked" bind:checked />
								<Label for="mutation-checked" class="leading-snug">
									{m.admin_ops_payment_mutation_checked({
										amount: formatMoney(detail.payment.totalAmount, 'IDR')
									})}
								</Label>
							</div>
							<Button disabled={!checked || busy} onclick={() => decide('approve')}>
								{#if busy}<LoaderCircle class="size-4 animate-spin" />{/if}
								{m.admin_ops_payment_approve()}
							</Button>

							<hr />

							<div class="space-y-1.5">
								<Label for="reject-reason">{m.admin_ops_payment_reject_reason()}</Label>
								<Select.Root type="single" bind:value={reason}>
									<Select.Trigger id="reject-reason" class="w-full">
										{REASONS.find((r) => r.value === reason)?.label ??
											m.admin_ops_payment_choose_reason()}
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
								<Label for="reject-note">{m.admin_ops_payment_reject_note()}</Label>
								<Textarea id="reject-note" bind:value={note} maxlength={500} />
							</div>
							<Button variant="destructive" disabled={busy} onclick={() => decide('reject')}>
								{m.admin_ops_payment_reject()}
							</Button>

							{#if actionError}
								<p class="text-sm text-destructive" role="alert">{actionError}</p>
							{/if}
						</Card.Content>
					</Card.Root>
				{/if}

				<Card.Root>
					<Card.Header><Card.Title>{m.admin_ops_payment_audit_log()}</Card.Title></Card.Header>
					<Card.Content>
						{#if detail.audit.length === 0}
							<p class="text-sm text-muted-foreground">{m.admin_ops_payment_no_activity()}</p>
						{:else}
							<ol class="space-y-2 text-sm">
								{#each detail.audit as entry (entry.id)}
									<li class="flex flex-wrap justify-between gap-2">
										<span>
											<strong>{auditLabel(entry.action)}</strong>
											{#if entry.note}· {auditNote(entry.note)}{/if}
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

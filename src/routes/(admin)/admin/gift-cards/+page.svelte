<script lang="ts">
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { onDestroy, onMount } from 'svelte';
	import { Eye, LoaderCircle, Pencil, Plus } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import GiftCardDialog from '#lib/frontend/components/admin/marketing/GiftCardDialog.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import * as Sheet from '#lib/frontend/components/ui/sheet/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';

	type GiftCardRow = {
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

	type GiftCardTransaction = {
		id: string;
		giftCardId: string;
		orderId: string | null;
		amount: number;
		type: string;
		createdAt: string;
	};

	type GiftCardDetail = GiftCardRow & { transactions: GiftCardTransaction[] };

	const columns = [
		{ key: 'code', label: 'Code' },
		{ key: 'balance', label: 'Balance', class: 'text-right' },
		{ key: 'initialAmount', label: 'Initial', class: 'text-right' },
		{ key: 'status', label: 'Status' },
		{ key: 'recipient', label: 'Recipient' },
		{ key: 'expiresAt', label: 'Expires' },
		{ key: 'actions', label: '', class: 'text-right' }
	];

	const pageSize = 25;

	let cards = $state<GiftCardRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	let q = $state('');
	let statusFilter = $state('all');
	let page = $state(1);
	let total = $state(0);

	let dialogOpen = $state(false);
	let editing = $state<GiftCardRow | null>(null);

	let detailOpen = $state(false);
	let detailCard = $state<GiftCardDetail | null>(null);
	let detailLoading = $state(false);
	let detailError = $state('');

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		void loadCards();
	});

	onDestroy(() => {
		if (searchTimer) clearTimeout(searchTimer);
	});

	async function loadCards() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams();
			params.set('page', String(page));
			params.set('pageSize', String(pageSize));
			if (q.trim()) params.set('q', q.trim());
			if (statusFilter !== 'all') params.set('status', statusFilter);

			const response = await fetch(`/api/admin/gift-cards?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load gift cards');

			cards = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load gift cards';
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		if (searchTimer) clearTimeout(searchTimer);

		searchTimer = setTimeout(() => {
			page = 1;
			void loadCards();
		}, 300);
	}

	function handleStatusChange(value: string) {
		statusFilter = value;
		page = 1;
		void loadCards();
	}

	function handlePageChange(nextPage: number) {
		page = nextPage;
		void loadCards();
	}

	function openCreate() {
		editing = null;
		dialogOpen = true;
	}

	function openEdit(row: Record<string, unknown>) {
		const item = cards.find((card) => card.id === String(row.id));
		if (!item) return;

		editing = item;
		dialogOpen = true;
	}

	async function openDetail(row: Record<string, unknown>) {
		const id = String(row.id);
		detailOpen = true;
		detailLoading = true;
		detailError = '';
		detailCard = null;

		try {
			const response = await fetch(`/api/admin/gift-cards/${id}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load gift card');

			detailCard = payload.data as GiftCardDetail;
		} catch (err) {
			detailError = err instanceof Error ? err.message : 'Could not load gift card';
		} finally {
			detailLoading = false;
		}
	}

	function formatDate(value: string | null) {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Gift cards</h1>
			<p class="text-sm text-muted-foreground">Issue and manage gift cards and their balances.</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="size-4" />
			Issue gift card
		</Button>
	</div>

	{#if error}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
			role="alert"
		>
			{error}
		</div>
	{/if}

	<Card.Root>
		<Card.Content class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="gift-card-search">Search</Label>
				<Input
					id="gift-card-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder="Search code, name or email"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="gift-card-status-filter">Status</Label>
				<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
					<Select.Trigger id="gift-card-status-filter" class="w-full">
						<Select.Value placeholder="All statuses" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label="All statuses">All statuses</Select.Item>
						<Select.Item value="active" label="Active">Active</Select.Item>
						<Select.Item value="redeemed" label="Redeemed">Redeemed</Select.Item>
						<Select.Item value="expired" label="Expired">Expired</Select.Item>
						<Select.Item value="disabled" label="Disabled">Disabled</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={cards as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No gift cards match the current filters."
		{page}
		{pageSize}
		{total}
		onPageChange={handlePageChange}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'code'}
				<code class="font-medium">{String(row.code ?? '')}</code>
			{:else if column.key === 'balance'}
				<span class="font-medium">
					{formatMoney(Number(row.balance ?? 0), String(row.currency ?? 'IDR'))}
				</span>
			{:else if column.key === 'initialAmount'}
				<span class="text-muted-foreground">
					{formatMoney(Number(row.initialAmount ?? 0), String(row.currency ?? 'IDR'))}
				</span>
			{:else if column.key === 'status'}
				<StatusBadge status={String(row.status ?? '')} />
			{:else if column.key === 'recipient'}
				<div class="space-y-0.5">
					{#if row.recipientName}
						<p>{String(row.recipientName)}</p>
					{/if}
					{#if row.recipientEmail}
						<p class="text-xs text-muted-foreground">{String(row.recipientEmail)}</p>
					{/if}
					{#if !row.recipientName && !row.recipientEmail}
						<span class="text-muted-foreground">—</span>
					{/if}
				</div>
			{:else if column.key === 'expiresAt'}
				<span class="text-muted-foreground">{formatDate(row.expiresAt as string | null)}</span>
			{:else if column.key === 'actions'}
				<div class="flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="View gift card"
						onclick={() => openDetail(row)}
					>
						<Eye class="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Edit gift card"
						onclick={() => openEdit(row)}
					>
						<Pencil class="size-4" />
					</Button>
				</div>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

{#if dialogOpen}
	<GiftCardDialog bind:open={dialogOpen} card={editing} onsaved={loadCards} />
{/if}

<Sheet.Root bind:open={detailOpen}>
	<Sheet.Content class="sm:max-w-lg">
		<Sheet.Header>
			<Sheet.Title>{detailCard ? `Gift card ${detailCard.code}` : 'Gift card details'}</Sheet.Title>
			<Sheet.Description>Balance, recipient details and transactions.</Sheet.Description>
		</Sheet.Header>

		<div class="flex-1 space-y-4 overflow-y-auto px-4">
			{#if detailLoading}
				<div class="flex h-40 items-center justify-center text-muted-foreground">
					<LoaderCircle class="size-6 animate-spin" />
				</div>
			{:else if detailError}
				<div
					class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
					role="alert"
				>
					{detailError}
				</div>
			{:else if detailCard}
				<div class="space-y-4">
					<div class="flex items-center justify-between gap-2">
						<code class="text-base font-semibold">{detailCard.code}</code>
						<StatusBadge status={detailCard.status} />
					</div>

					<div class="grid grid-cols-2 gap-3 text-sm">
						<div class="rounded-lg border p-3">
							<p class="text-xs text-muted-foreground">Balance</p>
							<p class="font-medium">
								{formatMoney(detailCard.balance, detailCard.currency)}
							</p>
						</div>
						<div class="rounded-lg border p-3">
							<p class="text-xs text-muted-foreground">Initial amount</p>
							<p class="font-medium">
								{formatMoney(detailCard.initialAmount, detailCard.currency)}
							</p>
						</div>
					</div>

					<div class="space-y-1 text-sm">
						<p class="text-xs text-muted-foreground">Recipient</p>
						<p class="font-medium">{detailCard.recipientName ?? '—'}</p>
						{#if detailCard.recipientEmail}
							<p class="text-muted-foreground">{detailCard.recipientEmail}</p>
						{/if}
					</div>

					{#if detailCard.message}
						<div class="space-y-1 text-sm">
							<p class="text-xs text-muted-foreground">Message</p>
							<p class="whitespace-pre-line">{detailCard.message}</p>
						</div>
					{/if}

					<div class="grid grid-cols-2 gap-3 text-sm">
						<div>
							<p class="text-xs text-muted-foreground">Issued</p>
							<p>{formatDate(detailCard.createdAt)}</p>
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Expires</p>
							<p>{formatDate(detailCard.expiresAt)}</p>
						</div>
					</div>

					<Separator />

					<div class="space-y-2">
						<p class="text-sm font-medium">Transactions</p>
						{#if detailCard.transactions.length === 0}
							<p class="text-sm text-muted-foreground">No transactions recorded yet.</p>
						{:else}
							<ul class="divide-y">
								{#each detailCard.transactions as transaction (transaction.id)}
									<li class="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
										<div class="space-y-0.5">
											<StatusBadge status={transaction.type} />
											<p class="text-xs text-muted-foreground">
												{formatDate(transaction.createdAt)}
											</p>
										</div>
										<span class="text-sm font-medium">
											{formatMoney(transaction.amount, detailCard.currency)}
										</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<Sheet.Footer>
			<Button variant="outline" onclick={() => (detailOpen = false)}>Close</Button>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>

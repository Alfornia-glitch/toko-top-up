<script lang="ts">
	import { onMount } from 'svelte';
	import { Check, RefreshCw, Search, Star, X } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import ConfirmDialog from '#lib/frontend/components/admin/ConfirmDialog.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';

	type ReviewRow = {
		id: string;
		productId: string;
		productName: string;
		userId: string | null;
		customerName: string | null;
		customerEmail: string | null;
		rating: number;
		title: string;
		body: string;
		status: string;
		helpfulCount: number;
		createdAt: string;
	};

	const columns = [
		{ key: 'productName', label: 'Product' },
		{ key: 'customer', label: 'Customer' },
		{ key: 'rating', label: 'Rating' },
		{ key: 'review', label: 'Review' },
		{ key: 'status', label: 'Status' },
		{ key: 'createdAt', label: 'Created' },
		{ key: 'actions', label: '', class: 'text-right' }
	];

	const pageSize = 25;

	let reviews = $state<ReviewRow[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let statusFilter = $state('all');
	let ratingFilter = $state('all');
	let page = $state(1);
	let total = $state(0);
	let mutatingId = $state('');

	let rejectOpen = $state(false);
	let rejectTarget = $state<ReviewRow | null>(null);

	onMount(() => {
		void loadReviews();
	});

	async function loadReviews() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: String(pageSize)
			});
			const term = search.trim();

			if (term) params.set('q', term);
			if (statusFilter !== 'all') params.set('status', statusFilter);
			if (ratingFilter !== 'all') params.set('rating', ratingFilter);

			const response = await fetch(`/api/admin/reviews?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load reviews');

			reviews = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load reviews';
		} finally {
			loading = false;
		}
	}

	function handleSearch(event: SubmitEvent) {
		event.preventDefault();
		page = 1;
		void loadReviews();
	}

	function handleStatusChange(value: string) {
		statusFilter = value;
		page = 1;
		void loadReviews();
	}

	function handleRatingChange(value: string) {
		ratingFilter = value;
		page = 1;
		void loadReviews();
	}

	function handlePageChange(nextPage: number) {
		page = nextPage;
		void loadReviews();
	}

	async function updateStatus(id: string, status: 'approved' | 'rejected') {
		mutatingId = id;
		error = '';

		try {
			const response = await fetch(`/api/admin/reviews/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ status })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not update review');

			await loadReviews();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not update review';
		} finally {
			mutatingId = '';
		}
	}

	function approveReview(row: ReviewRow) {
		void updateStatus(row.id, 'approved');
	}

	function openReject(row: ReviewRow) {
		rejectTarget = row;
		rejectOpen = true;
	}

	async function rejectReview() {
		if (!rejectTarget) return;

		await updateStatus(rejectTarget.id, 'rejected');
		rejectTarget = null;
	}

	const dateFormatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});

	function formatDate(value: string) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';

		return dateFormatter.format(date);
	}

	function reviewPreview(value: string) {
		const text = value.trim();
		if (!text) return '—';
		if (text.length <= 120) return text;

		return `${text.slice(0, 120)}…`;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Reviews</h1>
			<p class="text-sm text-muted-foreground">Moderate customer reviews before they go live.</p>
		</div>
		<Button variant="outline" onclick={() => void loadReviews()} disabled={loading}>
			<RefreshCw class="size-4" />
			Refresh
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
		<Card.Content class="py-4">
			<form class="flex flex-wrap items-end gap-3" onsubmit={handleSearch}>
				<div class="min-w-56 flex-1 space-y-1.5">
					<Label for="review-search">Search</Label>
					<div class="relative">
						<Search
							class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							id="review-search"
							bind:value={search}
							placeholder="Search title or body"
							class="pl-8"
						/>
					</div>
				</div>

				<div class="w-44 space-y-1.5">
					<Label for="review-status-filter">Status</Label>
					<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
						<Select.Trigger id="review-status-filter" class="w-full">
							<Select.Value placeholder="All statuses" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all" label="All statuses">All statuses</Select.Item>
							<Select.Item value="pending" label="Pending">Pending</Select.Item>
							<Select.Item value="approved" label="Approved">Approved</Select.Item>
							<Select.Item value="rejected" label="Rejected">Rejected</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="w-40 space-y-1.5">
					<Label for="review-rating-filter">Rating</Label>
					<Select.Root type="single" value={ratingFilter} onValueChange={handleRatingChange}>
						<Select.Trigger id="review-rating-filter" class="w-full">
							<Select.Value placeholder="All ratings" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all" label="All ratings">All ratings</Select.Item>
							<Select.Item value="5" label="5 stars">5 stars</Select.Item>
							<Select.Item value="4" label="4 stars">4 stars</Select.Item>
							<Select.Item value="3" label="3 stars">3 stars</Select.Item>
							<Select.Item value="2" label="2 stars">2 stars</Select.Item>
							<Select.Item value="1" label="1 star">1 star</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<Button type="submit" variant="outline">
					<Search class="size-4" />
					Search
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={reviews as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No reviews match the current filters."
		{page}
		{pageSize}
		{total}
		onPageChange={handlePageChange}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'productName'}
				<a
					href={`/admin/products/${String(row.productId ?? '')}`}
					class="block max-w-56 min-w-40 truncate font-medium hover:underline"
				>
					{String(row.productName ?? '')}
				</a>
			{:else if column.key === 'customer'}
				<div class="min-w-40">
					<p class="font-medium">{String(row.customerName ?? 'Guest')}</p>
					<p class="text-xs text-muted-foreground">{String(row.customerEmail ?? '—')}</p>
				</div>
			{:else if column.key === 'rating'}
				<div
					class="flex items-center gap-1"
					aria-label={`${Number(row.rating ?? 0)} out of 5 stars`}
				>
					{#each Array(5) as _, index (index)}
						<Star
							class={index < Number(row.rating ?? 0)
								? 'size-3.5 fill-amber-400 text-amber-400'
								: 'size-3.5 text-muted-foreground'}
						/>
					{/each}
				</div>
			{:else if column.key === 'review'}
				<div class="max-w-md min-w-48">
					<p class="truncate font-medium">{String(row.title ?? '')}</p>
					<p class="line-clamp-2 text-xs text-muted-foreground">
						{reviewPreview(String(row.body ?? ''))}
					</p>
				</div>
			{:else if column.key === 'status'}
				<StatusBadge status={String(row.status ?? '')} />
			{:else if column.key === 'createdAt'}
				<span class="text-muted-foreground">{formatDate(String(row.createdAt ?? ''))}</span>
			{:else if column.key === 'actions'}
				<div class="flex items-center justify-end gap-1">
					{#if row.status !== 'approved'}
						<Button
							variant="ghost"
							size="icon-sm"
							class="text-emerald-600 hover:bg-emerald-500/10"
							aria-label="Approve review"
							disabled={mutatingId === String(row.id)}
							onclick={() => approveReview(row as unknown as ReviewRow)}
						>
							<Check class="size-4" />
						</Button>
					{/if}
					{#if row.status !== 'rejected'}
						<Button
							variant="ghost"
							size="icon-sm"
							class="text-destructive hover:bg-destructive/10"
							aria-label="Reject review"
							disabled={mutatingId === String(row.id)}
							onclick={() => openReject(row as unknown as ReviewRow)}
						>
							<X class="size-4" />
						</Button>
					{/if}
				</div>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>

<ConfirmDialog
	bind:open={rejectOpen}
	title="Reject review"
	description={`Reject “${rejectTarget?.title ?? 'this review'}”? It will be hidden from the storefront.`}
	confirmLabel="Reject"
	destructive
	onConfirm={rejectReview}
/>

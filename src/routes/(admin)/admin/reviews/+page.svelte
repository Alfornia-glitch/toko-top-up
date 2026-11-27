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
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { formatDate } from '#lib/frontend/modules/commerce/format.ts';
	import { statusLabel } from '#lib/frontend/i18n/labels.ts';

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

	const columns = $derived([
		{ key: 'productName', label: m.admin_catalog_reviews_col_product() },
		{ key: 'customer', label: m.admin_catalog_reviews_col_customer() },
		{ key: 'rating', label: m.admin_catalog_reviews_rating() },
		{ key: 'review', label: m.admin_catalog_reviews_col_review() },
		{ key: 'status', label: m.common_status() },
		{ key: 'createdAt', label: m.admin_catalog_reviews_col_created() },
		{ key: 'actions', label: '', class: 'text-right' }
	]);

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

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_catalog_reviews_load_failed'));

			reviews = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = errorMessage(err, 'admin_catalog_reviews_load_failed');
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

			if (!response.ok)
				throw new Error(errorMessage(payload, 'admin_catalog_reviews_update_failed'));

			await loadReviews();
		} catch (err) {
			error = errorMessage(err, 'admin_catalog_reviews_update_failed');
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
			<h1 class="text-2xl font-semibold tracking-tight">{m.admin_catalog_reviews_title()}</h1>
			<p class="text-sm text-muted-foreground">{m.admin_catalog_reviews_subtitle()}</p>
		</div>
		<Button variant="outline" onclick={() => void loadReviews()} disabled={loading}>
			<RefreshCw class="size-4" />
			{m.common_refresh()}
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
					<Label for="review-search">{m.common_search()}</Label>
					<div class="relative">
						<Search
							class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							id="review-search"
							bind:value={search}
							placeholder={m.admin_catalog_reviews_search_placeholder()}
							class="pl-8"
						/>
					</div>
				</div>

				<div class="w-44 space-y-1.5">
					<Label for="review-status-filter">{m.common_status()}</Label>
					<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
						<Select.Trigger id="review-status-filter" class="w-full">
							<Select.Value placeholder={m.common_all_statuses()} />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all" label={m.common_all_statuses()}>
								{m.common_all_statuses()}
							</Select.Item>
							{#each ['pending', 'approved', 'rejected'] as value (value)}
								<Select.Item {value} label={statusLabel('review', value)}>
									{statusLabel('review', value)}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="w-40 space-y-1.5">
					<Label for="review-rating-filter">{m.admin_catalog_reviews_rating()}</Label>
					<Select.Root type="single" value={ratingFilter} onValueChange={handleRatingChange}>
						<Select.Trigger id="review-rating-filter" class="w-full">
							<Select.Value placeholder={m.admin_catalog_reviews_all_ratings()} />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all" label={m.admin_catalog_reviews_all_ratings()}>
								{m.admin_catalog_reviews_all_ratings()}
							</Select.Item>
							{#each [5, 4, 3, 2, 1] as stars (stars)}
								<Select.Item
									value={String(stars)}
									label={m.admin_catalog_reviews_stars({ count: stars })}
								>
									{m.admin_catalog_reviews_stars({ count: stars })}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<Button type="submit" variant="outline">
					<Search class="size-4" />
					{m.common_search()}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={reviews as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage={m.admin_catalog_reviews_empty()}
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
					<p class="font-medium">{String(row.customerName ?? m.admin_catalog_reviews_guest())}</p>
					<p class="text-xs text-muted-foreground">{String(row.customerEmail ?? '—')}</p>
				</div>
			{:else if column.key === 'rating'}
				<div
					class="flex items-center gap-1"
					aria-label={m.admin_catalog_reviews_rating_aria({ rating: Number(row.rating ?? 0) })}
				>
					{#each Array(5) as _, index (index)}
						<Star
							class={index < Number(row.rating ?? 0)
								? 'size-3.5 fill-rating text-rating'
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
				<span class="text-muted-foreground">
					{formatDate(String(row.createdAt ?? '')) || m.common_dash()}
				</span>
			{:else if column.key === 'actions'}
				<div class="flex items-center justify-end gap-1">
					{#if row.status !== 'approved'}
						<Button
							variant="ghost"
							size="icon-sm"
							class="text-success hover:bg-success/10"
							aria-label={m.admin_catalog_reviews_approve_aria()}
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
							aria-label={m.admin_catalog_reviews_reject_aria()}
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
	title={m.admin_catalog_reviews_reject_title()}
	description={m.admin_catalog_reviews_reject_description({
		title: rejectTarget?.title ?? m.admin_catalog_reviews_reject_this()
	})}
	confirmLabel={m.admin_catalog_reviews_reject_confirm()}
	cancelLabel={m.common_cancel()}
	destructive
	onConfirm={rejectReview}
/>

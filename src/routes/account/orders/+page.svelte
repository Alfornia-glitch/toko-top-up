<script lang="ts">
	import {
		listOrders,
		EmptyState,
		OrderStatusBadge,
		isUnauthorized
	} from '#lib/frontend/modules/account/index.ts';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page as appPage } from '$app/state';
	import { ArrowRight, Package } from '@lucide/svelte';
	import AccountPageShell from '#lib/frontend/modules/account/components/AccountPageShell.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Pagination from '#lib/frontend/components/ui/pagination/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';
	import { formatDate, formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import type { OrderSummary } from '#lib/frontend/modules/commerce/models.ts';

	let orders = $state<OrderSummary[]>([]);
	let loading = $state(true);
	let error = $state('');
	let page = $state(1);
	const pageSize = 10;
	let total = $state(0);

	const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));
	const rangeStart = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
	const rangeEnd = $derived(Math.min(page * pageSize, total));

	onMount(() => {
		const requested = Number(appPage.url.searchParams.get('page'));
		if (Number.isInteger(requested) && requested > 0) page = requested;
		void load();
	});

	async function load() {
		loading = true;
		error = '';

		try {
			const payload = await listOrders(page, pageSize);
			orders = payload.data;
			total = payload.total;
		} catch (cause) {
			if (isUnauthorized(cause)) {
				const target = `${appPage.url.pathname}${appPage.url.search}`;
				void goto(`/login?redirectTo=${encodeURIComponent(target)}`, { replaceState: true });
				return;
			}

			orders = [];
			total = 0;
			error = cause instanceof Error ? cause.message : 'Could not load orders';
		} finally {
			loading = false;
		}
	}

	function handlePageChange() {
		void load();
		void syncPageQuery();
	}

	async function syncPageQuery() {
		const params = new URLSearchParams(appPage.url.search);
		if (page > 1) {
			params.set('page', String(page));
		} else {
			params.delete('page');
		}

		const query = params.toString();
		const target = `${appPage.url.pathname}${query ? `?${query}` : ''}`;

		await goto(target, { replaceState: true });
	}
</script>

{#snippet tableHead()}
	<Table.Header>
		<Table.Row>
			<Table.Head class="pl-6">Order</Table.Head>
			<Table.Head>Placed</Table.Head>
			<Table.Head>Status</Table.Head>
			<Table.Head>Payment</Table.Head>
			<Table.Head>Items</Table.Head>
			<Table.Head>Total</Table.Head>
			<Table.Head class="pr-6 text-right">
				<span class="sr-only">Actions</span>
			</Table.Head>
		</Table.Row>
	</Table.Header>
{/snippet}

<AccountPageShell title="My orders" description="Track, review and manage your purchases.">
	{#snippet actions()}
		<Button variant="outline" href="/account">Back to account</Button>
	{/snippet}

	{#if loading}
		<div class="hidden md:block">
			<Card.Root class="overflow-hidden py-0">
				<Card.Content class="p-0">
					<Table.Root aria-label="Orders" aria-busy="true">
						{@render tableHead()}
						<Table.Body>
							{#each Array(5) as _, index (index)}
								<Table.Row>
									{#each Array(7) as _, cellIndex (cellIndex)}
										<Table.Cell>
											<Skeleton class="h-4 w-20" />
										</Table.Cell>
									{/each}
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="space-y-3 md:hidden">
			{#each Array(3) as _, index (index)}
				<Card.Root>
					<Card.Header class="gap-3">
						<div class="flex items-start justify-between gap-3">
							<div class="space-y-2">
								<Skeleton class="h-4 w-28" />
								<Skeleton class="h-3 w-20" />
							</div>
							<Skeleton class="h-4 w-16" />
						</div>
					</Card.Header>
					<Card.Content class="space-y-3">
						<div class="flex gap-2">
							<Skeleton class="h-5 w-20 rounded-full" />
							<Skeleton class="h-5 w-20 rounded-full" />
						</div>
						<Skeleton class="h-3 w-24" />
					</Card.Content>
					<Card.Footer>
						<Skeleton class="h-8 w-full" />
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{:else if error}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
			role="alert"
		>
			{error}
		</div>
	{:else if orders.length === 0}
		<EmptyState
			title="No orders yet"
			description="Orders you place will appear here with their latest status."
		>
			{#snippet icon()}
				<Package class="size-5" />
			{/snippet}
			{#snippet action()}
				<Button href="/products">Start shopping</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="hidden md:block">
			<Card.Root class="overflow-hidden py-0">
				<Card.Content class="p-0">
					<Table.Root aria-label="Orders">
						{@render tableHead()}
						<Table.Body>
							{#each orders as order (order.id)}
								<Table.Row>
									<Table.Cell class="pl-6 font-medium">{order.orderNumber}</Table.Cell>
									<Table.Cell class="text-muted-foreground">
										{formatDate(order.placedAt) || '—'}
									</Table.Cell>
									<Table.Cell>
										<OrderStatusBadge status={order.status} kind="order" />
									</Table.Cell>
									<Table.Cell>
										<OrderStatusBadge status={order.paymentStatus} kind="payment" />
									</Table.Cell>
									<Table.Cell>{order.itemCount ?? 0}</Table.Cell>
									<Table.Cell class="font-medium">
										{formatMoney(order.grandTotalCents, order.currency)}
									</Table.Cell>
									<Table.Cell class="pr-6 text-right">
										<a
											href={`/account/orders/${order.orderNumber}`}
											class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
											aria-label={`View order ${order.orderNumber}`}
										>
											<ArrowRight class="size-4" />
										</a>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="space-y-3 md:hidden">
			{#each orders as order (order.id)}
				<Card.Root>
					<Card.Header class="gap-3">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 space-y-1">
								<Card.Title class="truncate">{order.orderNumber}</Card.Title>
								<Card.Description>
									{formatDate(order.placedAt) || '—'}
								</Card.Description>
							</div>
							<p class="shrink-0 text-base font-semibold text-foreground">
								{formatMoney(order.grandTotalCents, order.currency)}
							</p>
						</div>
					</Card.Header>
					<Card.Content class="space-y-3">
						<div class="flex flex-wrap items-center gap-2">
							<OrderStatusBadge status={order.status} kind="order" />
							<OrderStatusBadge status={order.paymentStatus} kind="payment" />
						</div>
						<p class="text-sm text-muted-foreground">
							{order.itemCount ?? 0}
							{order.itemCount === 1 ? 'item' : 'items'}
						</p>
					</Card.Content>
					<Card.Footer>
						<Button href={`/account/orders/${order.orderNumber}`} class="w-full">View order</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="flex flex-col items-center justify-between gap-3 sm:flex-row">
				<p class="text-sm text-muted-foreground">
					Showing {rangeStart}–{rangeEnd} of {total} orders
				</p>
				<Pagination.Root count={total} perPage={pageSize} bind:page onPageChange={handlePageChange}>
					{#snippet children({ pages, currentPage })}
						<Pagination.Content>
							<Pagination.Item>
								<Pagination.Previous />
							</Pagination.Item>
							{#each pages as entry (entry.key)}
								{#if entry.type === 'ellipsis'}
									<Pagination.Item>
										<Pagination.Ellipsis />
									</Pagination.Item>
								{:else}
									<Pagination.Item>
										<Pagination.Link page={entry} isActive={currentPage === entry.value}>
											{entry.value}
										</Pagination.Link>
									</Pagination.Item>
								{/if}
							{/each}
							<Pagination.Item>
								<Pagination.Next />
							</Pagination.Item>
						</Pagination.Content>
					{/snippet}
				</Pagination.Root>
			</div>
		{/if}
	{/if}
</AccountPageShell>

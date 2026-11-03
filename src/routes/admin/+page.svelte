<script lang="ts">
	import { onMount } from 'svelte';
	import { AlertTriangle, DollarSign, Package, ShoppingCart, Users, Clock } from '@lucide/svelte';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import StatCard from '#lib/frontend/components/admin/StatCard.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';

	type Stats = {
		products: number;
		orders: number;
		customers: number;
		revenueCents: number;
		pendingOrders: number;
		lowStockVariants: number;
		recentOrders: Array<{
			id: string;
			orderNumber: string;
			status: string;
			paymentStatus: string;
			grandTotalCents: number;
			currency: string;
			placedAt: string;
		}>;
		lowStock: Array<{ id: string; name: string; sku: string; stock: number }>;
	};

	let stats = $state<Stats | null>(null);
	let loading = $state(true);
	let error = $state('');

	const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

	function formatMoney(cents: number, currency = 'USD') {
		if (currency === 'USD') return money.format(cents / 100);

		return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
	}

	function formatDate(value: string) {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(value));
	}

	onMount(async () => {
		try {
			const response = await fetch('/api/admin/stats');
			const payload = await response.json();

			if (!response.ok) throw new Error(payload.error ?? 'Could not load stats');
			stats = payload.data;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load stats';
		} finally {
			loading = false;
		}
	});
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
		<p class="text-sm text-muted-foreground">Store performance at a glance.</p>
	</div>

	{#if error}
		<Card.Root>
			<Card.Content class="py-6 text-sm text-destructive">{error}</Card.Content>
		</Card.Root>
	{/if}

	{#if loading}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
			{#each Array(6) as _, index (index)}
				<Skeleton class="h-28 w-full rounded-xl" />
			{/each}
		</div>
	{:else if stats}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
			<StatCard
				title="Revenue"
				value={formatMoney(stats.revenueCents)}
				hint="Paid and fulfilled orders"
				icon={DollarSign}
			/>
			<StatCard title="Orders" value={stats.orders} hint="All time" icon={ShoppingCart} />
			<StatCard title="Pending" value={stats.pendingOrders} hint="Awaiting payment" icon={Clock} />
			<StatCard title="Products" value={stats.products} hint="In catalog" icon={Package} />
			<StatCard title="Customers" value={stats.customers} hint="Registered" icon={Users} />
			<StatCard
				title="Low stock"
				value={stats.lowStockVariants}
				hint="Variants at 5 or fewer"
				icon={AlertTriangle}
			/>
		</div>

		<div class="grid gap-4 lg:grid-cols-3">
			<Card.Root class="lg:col-span-2">
				<Card.Header>
					<Card.Title>Recent orders</Card.Title>
					<Card.Description>Latest orders across the store.</Card.Description>
				</Card.Header>
				<Card.Content>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Order</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Payment</Table.Head>
								<Table.Head>Placed</Table.Head>
								<Table.Head class="text-right">Total</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#if stats.recentOrders.length === 0}
								<Table.Row>
									<Table.Cell colspan={5} class="h-24 text-center text-muted-foreground">
										No orders yet.
									</Table.Cell>
								</Table.Row>
							{:else}
								{#each stats.recentOrders as order (order.id)}
									<Table.Row>
										<Table.Cell>
											<a href={`/admin/orders/${order.id}`} class="font-medium hover:underline">
												{order.orderNumber}
											</a>
										</Table.Cell>
										<Table.Cell><StatusBadge status={order.status} /></Table.Cell>
										<Table.Cell><StatusBadge status={order.paymentStatus} /></Table.Cell>
										<Table.Cell class="text-muted-foreground">
											{formatDate(order.placedAt)}
										</Table.Cell>
										<Table.Cell class="text-right">
											{formatMoney(order.grandTotalCents, order.currency)}
										</Table.Cell>
									</Table.Row>
								{/each}
							{/if}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Low stock</Card.Title>
					<Card.Description>Variants that need restocking first.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#if stats.lowStock.length === 0}
						<p class="text-sm text-muted-foreground">Everything is well stocked.</p>
					{:else}
						{#each stats.lowStock as variant (variant.id)}
							<div class="flex items-center justify-between gap-3 text-sm">
								<div class="min-w-0">
									<p class="truncate font-medium">{variant.name}</p>
									<p class="truncate text-xs text-muted-foreground">{variant.sku}</p>
								</div>
								<span class="text-destructive">{variant.stock} left</span>
							</div>
						{/each}
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>

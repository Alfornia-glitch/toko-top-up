<script lang="ts">
	import { formatDateTime, formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
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
		revenue: number;
		pendingOrders: number;
		lowStockVariants: number;
		recentOrders: Array<{
			id: string;
			orderNumber: string;
			status: string;
			paymentStatus: string;
			grandTotal: number;
			currency: string;
			placedAt: string;
		}>;
		lowStock: Array<{ id: string; name: string; sku: string; stock: number }>;
	};

	let stats = $state<Stats | null>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const response = await fetch('/api/admin/stats');
			const payload = await response.json();

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_dashboard_load_failed'));
			stats = payload.data;
		} catch (err) {
			error = errorMessage(err, 'admin_ops_dashboard_load_failed');
		} finally {
			loading = false;
		}
	});
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{m.admin_ops_dashboard_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.admin_ops_dashboard_subtitle()}</p>
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
				title={m.admin_ops_dashboard_revenue()}
				value={formatMoney(stats.revenue)}
				hint={m.admin_ops_dashboard_revenue_hint()}
				icon={DollarSign}
			/>
			<StatCard
				title={m.common_orders()}
				value={stats.orders}
				hint={m.admin_ops_dashboard_orders_hint()}
				icon={ShoppingCart}
			/>
			<StatCard
				title={m.admin_ops_dashboard_pending()}
				value={stats.pendingOrders}
				hint={m.admin_ops_dashboard_pending_hint()}
				icon={Clock}
			/>
			<StatCard
				title={m.common_products()}
				value={stats.products}
				hint={m.admin_ops_dashboard_products_hint()}
				icon={Package}
			/>
			<StatCard
				title={m.common_customers()}
				value={stats.customers}
				hint={m.admin_ops_dashboard_customers_hint()}
				icon={Users}
			/>
			<StatCard
				title={m.admin_ops_dashboard_low_stock()}
				value={stats.lowStockVariants}
				hint={m.admin_ops_dashboard_low_stock_hint()}
				icon={AlertTriangle}
			/>
		</div>

		<div class="grid gap-4 lg:grid-cols-3">
			<Card.Root class="lg:col-span-2">
				<Card.Header>
					<Card.Title>{m.admin_ops_dashboard_recent_orders()}</Card.Title>
					<Card.Description>{m.admin_ops_dashboard_recent_orders_desc()}</Card.Description>
				</Card.Header>
				<Card.Content>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>{m.common_order()}</Table.Head>
								<Table.Head>{m.common_status()}</Table.Head>
								<Table.Head>{m.common_payment()}</Table.Head>
								<Table.Head>{m.admin_ops_dashboard_col_placed()}</Table.Head>
								<Table.Head class="text-right">{m.common_total()}</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#if stats.recentOrders.length === 0}
								<Table.Row>
									<Table.Cell colspan={5} class="h-24 text-center text-muted-foreground">
										{m.admin_ops_dashboard_no_orders()}
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
											{formatDateTime(order.placedAt)}
										</Table.Cell>
										<Table.Cell class="text-right">
											{formatMoney(order.grandTotal, order.currency)}
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
					<Card.Title>{m.admin_ops_dashboard_low_stock()}</Card.Title>
					<Card.Description>{m.admin_ops_dashboard_low_stock_desc()}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#if stats.lowStock.length === 0}
						<p class="text-sm text-muted-foreground">{m.admin_ops_dashboard_well_stocked()}</p>
					{:else}
						{#each stats.lowStock as variant (variant.id)}
							<div class="flex items-center justify-between gap-3 text-sm">
								<div class="min-w-0">
									<p class="truncate font-medium">{variant.name}</p>
									<p class="truncate text-xs text-muted-foreground">{variant.sku}</p>
								</div>
								<span class="text-destructive"
									>{m.admin_ops_dashboard_stock_left({ count: variant.stock })}</span
								>
							</div>
						{/each}
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>

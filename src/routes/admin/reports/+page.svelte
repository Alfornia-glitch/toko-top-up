<script lang="ts">
	import { onMount } from 'svelte';
	import { getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import {
		CalendarDays,
		DollarSign,
		LoaderCircle,
		Package,
		RefreshCw,
		ShoppingCart,
		TrendingUp,
		TriangleAlert
	} from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatCard from '#lib/frontend/components/admin/StatCard.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Calendar } from '#lib/frontend/components/ui/calendar/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Popover from '#lib/frontend/components/ui/popover/index.ts';
	import * as Progress from '#lib/frontend/components/ui/progress/index.ts';
	import * as Tabs from '#lib/frontend/components/ui/tabs/index.ts';

	type DailyRow = {
		date: string;
		orders: number;
		revenueCents: number;
	};

	type TopProductRow = {
		name: string;
		sku: string;
		quantity: number;
		totalCents: number;
	};

	type SalesReport = {
		from: string;
		to: string;
		revenueCents: number;
		orderCount: number;
		paidOrders: number;
		averageOrderCents: number;
		statusCounts: Record<string, number>;
		daily: DailyRow[];
		topProducts: TopProductRow[];
	};

	type LowStockVariant = {
		id: string;
		name: string;
		sku: string;
		stock: number;
		priceCents: number;
		status: string;
		productName: string;
	};

	type MovementRow = {
		variantId: string;
		delta: number;
		entries: number;
	};

	type InventoryReport = {
		variantCount: number;
		stockValueCents: number;
		outOfStock: number;
		lowStock: number;
		bands: { out: number; low: number; healthy: number };
		lowStockVariants: LowStockVariant[];
		recentMovements: MovementRow[];
	};

	const initialEnd = today(getLocalTimeZone());

	let tab = $state('sales');
	let fromDate = $state<DateValue | undefined>(initialEnd.add({ days: -29 }));
	let toDate = $state<DateValue | undefined>(initialEnd);
	let fromOpen = $state(false);
	let toOpen = $state(false);

	let sales = $state<SalesReport | null>(null);
	let salesLoading = $state(true);
	let salesError = $state('');

	let inventory = $state<InventoryReport | null>(null);
	let inventoryLoading = $state(true);
	let inventoryError = $state('');

	const dailyRows = $derived((sales?.daily ?? []).map((row) => ({ ...row, id: row.date })));
	const topProductRows = $derived(
		(sales?.topProducts ?? []).map((row, index) => ({ ...row, id: `${row.sku}-${index}` }))
	);
	const lowStockRows = $derived(inventory?.lowStockVariants ?? []);
	const movementRows = $derived(inventory?.recentMovements ?? []);

	const statusRows = $derived(
		sales
			? Object.entries(sales.statusCounts)
					.map(([status, count]) => ({
						status,
						count,
						percent: (sales?.orderCount ?? 0) > 0 ? (count / (sales?.orderCount ?? 1)) * 100 : 0
					}))
					.sort((a, b) => b.count - a.count)
			: []
	);

	const bandRows = $derived(
		inventory
			? [
					{
						key: 'healthy',
						label: 'Healthy stock',
						count: inventory.bands.healthy,
						percent:
							inventory.variantCount > 0
								? (inventory.bands.healthy / inventory.variantCount) * 100
								: 0
					},
					{
						key: 'low',
						label: 'Low stock',
						count: inventory.bands.low,
						percent:
							inventory.variantCount > 0 ? (inventory.bands.low / inventory.variantCount) * 100 : 0
					},
					{
						key: 'out',
						label: 'Out of stock',
						count: inventory.bands.out,
						percent:
							inventory.variantCount > 0 ? (inventory.bands.out / inventory.variantCount) * 100 : 0
					}
				]
			: []
	);

	const dailyColumns = [
		{ key: 'date', label: 'Date' },
		{ key: 'orders', label: 'Orders', class: 'text-right' },
		{ key: 'revenueCents', label: 'Revenue', class: 'text-right' }
	];

	const topProductColumns = [
		{ key: 'name', label: 'Product' },
		{ key: 'sku', label: 'SKU' },
		{ key: 'quantity', label: 'Units', class: 'text-right' },
		{ key: 'totalCents', label: 'Revenue', class: 'text-right' }
	];

	const lowStockColumns = [
		{ key: 'productName', label: 'Product' },
		{ key: 'name', label: 'Variant' },
		{ key: 'sku', label: 'SKU' },
		{ key: 'stock', label: 'Stock', class: 'text-right' }
	];

	const movementColumns = [
		{ key: 'variantId', label: 'Variant' },
		{ key: 'delta', label: 'Net change', class: 'text-right' },
		{ key: 'entries', label: 'Entries', class: 'text-right' }
	];

	onMount(() => {
		void loadSales();
		void loadInventory();
	});

	async function loadSales() {
		salesLoading = true;
		salesError = '';

		try {
			const params = new URLSearchParams();
			const from = toIso(fromDate, false);
			const to = toIso(toDate, true);

			if (from) params.set('from', from);
			if (to) params.set('to', to);

			const response = await fetch(`/api/admin/reports/sales?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load the sales report');

			sales = payload.data ?? null;
		} catch (err) {
			salesError = err instanceof Error ? err.message : 'Could not load the sales report';
		} finally {
			salesLoading = false;
		}
	}

	async function loadInventory() {
		inventoryLoading = true;
		inventoryError = '';

		try {
			const response = await fetch('/api/admin/reports/inventory');
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load the inventory report');

			inventory = payload.data ?? null;
		} catch (err) {
			inventoryError = err instanceof Error ? err.message : 'Could not load the inventory report';
		} finally {
			inventoryLoading = false;
		}
	}

	function handleFromChange(value: DateValue | undefined) {
		fromDate = value;
		fromOpen = false;
		void loadSales();
	}

	function handleToChange(value: DateValue | undefined) {
		toDate = value;
		toOpen = false;
		void loadSales();
	}

	function refresh() {
		void loadSales();
		void loadInventory();
	}

	function toIso(value: DateValue | undefined, endOfDay: boolean) {
		if (!value) return undefined;

		const date = value.toDate(getLocalTimeZone());

		if (endOfDay) {
			date.setHours(23, 59, 59, 999);
		} else {
			date.setHours(0, 0, 0, 0);
		}

		return date.toISOString();
	}

	const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
	const number = new Intl.NumberFormat('en-US');
	const rangeFormatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	const dayFormatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	});

	function formatMoney(cents: number) {
		return money.format((cents ?? 0) / 100);
	}

	function formatNumber(value: number) {
		return number.format(value ?? 0);
	}

	function formatRangeDate(value: DateValue | undefined) {
		if (!value) return 'Any date';

		return rangeFormatter.format(value.toDate(getLocalTimeZone()));
	}

	function formatDay(value: string) {
		const date = new Date(`${value}T00:00:00Z`);
		if (Number.isNaN(date.getTime())) return value;

		return dayFormatter.format(date);
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Reports</h1>
			<p class="text-sm text-muted-foreground">Review sales performance and inventory health.</p>
		</div>
		<Button variant="outline" onclick={refresh} disabled={salesLoading && inventoryLoading}>
			<RefreshCw class="size-4" />
			Refresh
		</Button>
	</div>

	<Tabs.Root bind:value={tab}>
		<Tabs.List>
			<Tabs.Trigger value="sales">Sales</Tabs.Trigger>
			<Tabs.Trigger value="inventory">Inventory</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="sales" class="mt-4 space-y-6">
			{#if salesError}
				<div
					class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
					role="alert"
				>
					{salesError}
				</div>
			{/if}

			<Card.Root>
				<Card.Content class="flex flex-wrap items-end gap-3 py-4">
					<div class="space-y-1.5">
						<Label>From</Label>
						<Popover.Root bind:open={fromOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button variant="outline" {...props}>
										<CalendarDays class="size-4" />
										{formatRangeDate(fromDate)}
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-auto p-0" align="start">
								<Calendar
									type="single"
									value={fromDate}
									onValueChange={handleFromChange}
									weekdayFormat="short"
									captionLayout="dropdown"
								/>
							</Popover.Content>
						</Popover.Root>
					</div>

					<div class="space-y-1.5">
						<Label>To</Label>
						<Popover.Root bind:open={toOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button variant="outline" {...props}>
										<CalendarDays class="size-4" />
										{formatRangeDate(toDate)}
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-auto p-0" align="start">
								<Calendar
									type="single"
									value={toDate}
									onValueChange={handleToChange}
									weekdayFormat="short"
									captionLayout="dropdown"
								/>
							</Popover.Content>
						</Popover.Root>
					</div>
				</Card.Content>
			</Card.Root>

			{#if salesLoading}
				<div
					class="flex h-48 items-center justify-center rounded-lg border bg-card text-muted-foreground"
				>
					<LoaderCircle class="size-5 animate-spin" />
				</div>
			{:else if sales}
				<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<StatCard
						title="Revenue"
						value={formatMoney(sales.revenueCents)}
						hint="Paid orders in range"
						icon={DollarSign}
					/>
					<StatCard
						title="Orders"
						value={formatNumber(sales.orderCount)}
						hint={`${formatNumber(sales.paidOrders)} paid`}
						icon={ShoppingCart}
					/>
					<StatCard
						title="Average order value"
						value={formatMoney(sales.averageOrderCents)}
						hint="Paid orders only"
						icon={TrendingUp}
					/>
					<StatCard
						title="Paid orders"
						value={formatNumber(sales.paidOrders)}
						hint="Processing, shipped or delivered"
						icon={Package}
					/>
				</div>

				<Card.Root>
					<Card.Header>
						<Card.Title>Orders by status</Card.Title>
						<Card.Description>Share of all orders placed in the selected range.</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						{#if statusRows.length === 0}
							<p class="text-sm text-muted-foreground">No orders in this range.</p>
						{:else}
							{#each statusRows as row (row.status)}
								<div class="space-y-1.5">
									<div class="flex items-center justify-between gap-2 text-sm">
										<StatusBadge status={row.status} />
										<span class="text-muted-foreground">
											{formatNumber(row.count)} · {row.percent.toFixed(0)}%
										</span>
									</div>
									<Progress.Root value={row.percent} class="h-2" />
								</div>
							{/each}
						{/if}
					</Card.Content>
				</Card.Root>

				<div class="space-y-3">
					<div>
						<h2 class="text-lg font-semibold tracking-tight">Daily series</h2>
						<p class="text-sm text-muted-foreground">Orders and revenue grouped by day.</p>
					</div>
					<DataTable
						columns={dailyColumns}
						rows={dailyRows as unknown as Record<string, unknown>[]}
						emptyMessage="No orders in this range."
						page={1}
						pageSize={Math.max(dailyRows.length, 1)}
						total={dailyRows.length}
					>
						{#snippet cell(row, column)}
							{#if column.key === 'date'}
								{formatDay(String(row.date ?? ''))}
							{:else if column.key === 'orders'}
								{formatNumber(Number(row.orders ?? 0))}
							{:else if column.key === 'revenueCents'}
								<span class="font-medium">{formatMoney(Number(row.revenueCents ?? 0))}</span>
							{:else}
								{String(row[column.key] ?? '—')}
							{/if}
						{/snippet}
					</DataTable>
				</div>

				<div class="space-y-3">
					<div>
						<h2 class="text-lg font-semibold tracking-tight">Top products</h2>
						<p class="text-sm text-muted-foreground">
							Best sellers by revenue in the selected range.
						</p>
					</div>
					<DataTable
						columns={topProductColumns}
						rows={topProductRows as unknown as Record<string, unknown>[]}
						emptyMessage="No product sales in this range."
						page={1}
						pageSize={Math.max(topProductRows.length, 1)}
						total={topProductRows.length}
					>
						{#snippet cell(row, column)}
							{#if column.key === 'name'}
								<span class="font-medium">{String(row.name ?? '')}</span>
							{:else if column.key === 'sku'}
								<code class="text-xs text-muted-foreground">{String(row.sku ?? '')}</code>
							{:else if column.key === 'quantity'}
								{formatNumber(Number(row.quantity ?? 0))}
							{:else if column.key === 'totalCents'}
								<span class="font-medium">{formatMoney(Number(row.totalCents ?? 0))}</span>
							{:else}
								{String(row[column.key] ?? '—')}
							{/if}
						{/snippet}
					</DataTable>
				</div>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="inventory" class="mt-4 space-y-6">
			{#if inventoryError}
				<div
					class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
					role="alert"
				>
					{inventoryError}
				</div>
			{/if}

			{#if inventoryLoading}
				<div
					class="flex h-48 items-center justify-center rounded-lg border bg-card text-muted-foreground"
				>
					<LoaderCircle class="size-5 animate-spin" />
				</div>
			{:else if inventory}
				<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<StatCard
						title="Stock value"
						value={formatMoney(inventory.stockValueCents)}
						hint="Retail value at current prices"
						icon={DollarSign}
					/>
					<StatCard
						title="Low stock"
						value={formatNumber(inventory.lowStock)}
						hint="Variants with 5 or fewer units"
						icon={TriangleAlert}
					/>
					<StatCard
						title="Out of stock"
						value={formatNumber(inventory.outOfStock)}
						hint="Variants with zero units"
						icon={Package}
					/>
					<StatCard
						title="Variants"
						value={formatNumber(inventory.variantCount)}
						hint="Across all products"
						icon={TrendingUp}
					/>
				</div>

				<Card.Root>
					<Card.Header>
						<Card.Title>Stock bands</Card.Title>
						<Card.Description>Distribution of variants by stock level.</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						{#each bandRows as row (row.key)}
							<div class="space-y-1.5">
								<div class="flex items-center justify-between gap-2 text-sm">
									<span class="font-medium">{row.label}</span>
									<span class="text-muted-foreground">
										{formatNumber(row.count)} · {row.percent.toFixed(0)}%
									</span>
								</div>
								<Progress.Root value={row.percent} class="h-2" />
							</div>
						{/each}
					</Card.Content>
				</Card.Root>

				<div class="space-y-3">
					<div>
						<h2 class="text-lg font-semibold tracking-tight">Low stock variants</h2>
						<p class="text-sm text-muted-foreground">Variants at or below the restock threshold.</p>
					</div>
					<DataTable
						columns={lowStockColumns}
						rows={lowStockRows as unknown as Record<string, unknown>[]}
						emptyMessage="All variants are above the low stock threshold."
						page={1}
						pageSize={Math.max(lowStockRows.length, 1)}
						total={lowStockRows.length}
					>
						{#snippet cell(row, column)}
							{#if column.key === 'productName'}
								<span class="font-medium">{String(row.productName ?? '')}</span>
							{:else if column.key === 'name'}
								{String(row.name ?? '')}
							{:else if column.key === 'sku'}
								<code class="text-xs text-muted-foreground">{String(row.sku ?? '')}</code>
							{:else if column.key === 'stock'}
								<span class="font-semibold text-destructive"
									>{formatNumber(Number(row.stock ?? 0))}</span
								>
							{:else}
								{String(row[column.key] ?? '—')}
							{/if}
						{/snippet}
					</DataTable>
				</div>

				<div class="space-y-3">
					<div>
						<h2 class="text-lg font-semibold tracking-tight">Recent movements</h2>
						<p class="text-sm text-muted-foreground">Net stock changes over the last 30 days.</p>
					</div>
					<DataTable
						columns={movementColumns}
						rows={movementRows as unknown as Record<string, unknown>[]}
						emptyMessage="No stock movements in the last 30 days."
						page={1}
						pageSize={Math.max(movementRows.length, 1)}
						total={movementRows.length}
					>
						{#snippet cell(row, column)}
							{#if column.key === 'variantId'}
								<code class="text-xs text-muted-foreground">{String(row.variantId ?? '')}</code>
							{:else if column.key === 'delta'}
								<span
									class={Number(row.delta) >= 0
										? 'font-semibold text-emerald-600'
										: 'font-semibold text-destructive'}
								>
									{Number(row.delta) > 0 ? '+' : ''}{formatNumber(Number(row.delta ?? 0))}
								</span>
							{:else if column.key === 'entries'}
								{formatNumber(Number(row.entries ?? 0))}
							{:else}
								{String(row[column.key] ?? '—')}
							{/if}
						{/snippet}
					</DataTable>
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>

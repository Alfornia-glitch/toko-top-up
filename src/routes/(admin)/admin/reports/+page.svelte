<script lang="ts">
	import {
		formatDate,
		formatMoney,
		formatNumber,
		formatPercent
	} from '#lib/frontend/modules/commerce/format.ts';
	import { intlLocale } from '#lib/frontend/i18n/locale.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
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
		revenue: number;
	};

	type TopProductRow = {
		name: string;
		sku: string;
		quantity: number;
		total: number;
	};

	type SalesReport = {
		from: string;
		to: string;
		revenue: number;
		orderCount: number;
		paidOrders: number;
		averageOrder: number;
		statusCounts: Record<string, number>;
		daily: DailyRow[];
		topProducts: TopProductRow[];
	};

	type LowStockVariant = {
		id: string;
		name: string;
		sku: string;
		stock: number;
		price: number;
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
		stockValue: number;
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

	const bandRows = $derived.by(() =>
		inventory
			? [
					{
						key: 'healthy',
						label: m.admin_catalog_reports_band_healthy(),
						count: inventory.bands.healthy,
						percent:
							inventory.variantCount > 0
								? (inventory.bands.healthy / inventory.variantCount) * 100
								: 0
					},
					{
						key: 'low',
						label: m.admin_catalog_reports_band_low(),
						count: inventory.bands.low,
						percent:
							inventory.variantCount > 0 ? (inventory.bands.low / inventory.variantCount) * 100 : 0
					},
					{
						key: 'out',
						label: m.admin_catalog_reports_band_out(),
						count: inventory.bands.out,
						percent:
							inventory.variantCount > 0 ? (inventory.bands.out / inventory.variantCount) * 100 : 0
					}
				]
			: []
	);

	const dailyColumns = $derived([
		{ key: 'date', label: m.admin_catalog_reports_col_date() },
		{ key: 'orders', label: m.common_orders(), class: 'text-right' },
		{ key: 'revenue', label: m.admin_catalog_reports_col_revenue(), class: 'text-right' }
	]);

	const topProductColumns = $derived([
		{ key: 'name', label: m.common_product() },
		{ key: 'sku', label: m.admin_catalog_products_col_sku() },
		{ key: 'quantity', label: m.admin_catalog_reports_col_units(), class: 'text-right' },
		{ key: 'total', label: m.admin_catalog_reports_col_revenue(), class: 'text-right' }
	]);

	const lowStockColumns = $derived([
		{ key: 'productName', label: m.common_product() },
		{ key: 'name', label: m.admin_catalog_reports_col_variant() },
		{ key: 'sku', label: m.admin_catalog_products_col_sku() },
		{ key: 'stock', label: m.admin_catalog_inventory_col_stock(), class: 'text-right' }
	]);

	const movementColumns = $derived([
		{ key: 'variantId', label: m.admin_catalog_reports_col_variant() },
		{ key: 'delta', label: m.admin_catalog_reports_col_net_change(), class: 'text-right' },
		{ key: 'entries', label: m.admin_catalog_reports_col_entries(), class: 'text-right' }
	]);

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

			if (!response.ok)
				throw new Error(errorMessage(payload, 'admin_catalog_reports_sales_load_failed'));

			sales = payload.data ?? null;
		} catch (err) {
			salesError = errorMessage(err, 'admin_catalog_reports_sales_load_failed');
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

			if (!response.ok)
				throw new Error(errorMessage(payload, 'admin_catalog_reports_inventory_load_failed'));

			inventory = payload.data ?? null;
		} catch (err) {
			inventoryError = errorMessage(err, 'admin_catalog_reports_inventory_load_failed');
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

	function formatRangeDate(value: DateValue | undefined) {
		if (!value) return m.admin_catalog_reports_any_date();

		return formatDate(value.toDate(getLocalTimeZone()));
	}

	function formatDay(value: string) {
		const date = new Date(`${value}T00:00:00Z`);
		if (Number.isNaN(date.getTime())) return value;

		return new Intl.DateTimeFormat(intlLocale(), {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(date);
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.admin_catalog_reports_title()}</h1>
			<p class="text-sm text-muted-foreground">{m.admin_catalog_reports_subtitle()}</p>
		</div>
		<Button variant="outline" onclick={refresh} disabled={salesLoading && inventoryLoading}>
			<RefreshCw class="size-4" />
			{m.common_refresh()}
		</Button>
	</div>

	<Tabs.Root bind:value={tab}>
		<Tabs.List>
			<Tabs.Trigger value="sales">{m.admin_catalog_reports_tab_sales()}</Tabs.Trigger>
			<Tabs.Trigger value="inventory">{m.admin_catalog_reports_tab_inventory()}</Tabs.Trigger>
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
						<Label>{m.admin_catalog_reports_from()}</Label>
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
						<Label>{m.admin_catalog_reports_to()}</Label>
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
						title={m.admin_catalog_reports_stat_revenue()}
						value={formatMoney(sales.revenue)}
						hint={m.admin_catalog_reports_stat_revenue_hint()}
						icon={DollarSign}
					/>
					<StatCard
						title={m.admin_catalog_reports_stat_orders()}
						value={formatNumber(sales.orderCount)}
						hint={m.admin_catalog_reports_stat_orders_hint({
							count: formatNumber(sales.paidOrders)
						})}
						icon={ShoppingCart}
					/>
					<StatCard
						title={m.admin_catalog_reports_stat_aov()}
						value={formatMoney(sales.averageOrder)}
						hint={m.admin_catalog_reports_stat_aov_hint()}
						icon={TrendingUp}
					/>
					<StatCard
						title={m.admin_catalog_reports_stat_paid()}
						value={formatNumber(sales.paidOrders)}
						hint={m.admin_catalog_reports_stat_paid_hint()}
						icon={Package}
					/>
				</div>

				<Card.Root>
					<Card.Header>
						<Card.Title>{m.admin_catalog_reports_status_title()}</Card.Title>
						<Card.Description>{m.admin_catalog_reports_status_description()}</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						{#if statusRows.length === 0}
							<p class="text-sm text-muted-foreground">{m.admin_catalog_reports_no_orders()}</p>
						{:else}
							{#each statusRows as row (row.status)}
								<div class="space-y-1.5">
									<div class="flex items-center justify-between gap-2 text-sm">
										<StatusBadge status={row.status} />
										<span class="text-muted-foreground">
											{formatNumber(row.count)} · {formatPercent(row.percent / 100)}
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
						<h2 class="text-lg font-semibold tracking-tight">
							{m.admin_catalog_reports_daily_title()}
						</h2>
						<p class="text-sm text-muted-foreground">
							{m.admin_catalog_reports_daily_description()}
						</p>
					</div>
					<DataTable
						columns={dailyColumns}
						rows={dailyRows as unknown as Record<string, unknown>[]}
						emptyMessage={m.admin_catalog_reports_no_orders()}
						page={1}
						pageSize={Math.max(dailyRows.length, 1)}
						total={dailyRows.length}
					>
						{#snippet cell(row, column)}
							{#if column.key === 'date'}
								{formatDay(String(row.date ?? ''))}
							{:else if column.key === 'orders'}
								{formatNumber(Number(row.orders ?? 0))}
							{:else if column.key === 'revenue'}
								<span class="font-medium">{formatMoney(Number(row.revenue ?? 0))}</span>
							{:else}
								{String(row[column.key] ?? '—')}
							{/if}
						{/snippet}
					</DataTable>
				</div>

				<div class="space-y-3">
					<div>
						<h2 class="text-lg font-semibold tracking-tight">
							{m.admin_catalog_reports_top_title()}
						</h2>
						<p class="text-sm text-muted-foreground">
							{m.admin_catalog_reports_top_description()}
						</p>
					</div>
					<DataTable
						columns={topProductColumns}
						rows={topProductRows as unknown as Record<string, unknown>[]}
						emptyMessage={m.admin_catalog_reports_no_product_sales()}
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
							{:else if column.key === 'total'}
								<span class="font-medium">{formatMoney(Number(row.total ?? 0))}</span>
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
						title={m.admin_catalog_reports_stat_stock_value()}
						value={formatMoney(inventory.stockValue)}
						hint={m.admin_catalog_reports_stat_stock_value_hint()}
						icon={DollarSign}
					/>
					<StatCard
						title={m.admin_catalog_reports_stat_low_stock()}
						value={formatNumber(inventory.lowStock)}
						hint={m.admin_catalog_reports_stat_low_stock_hint()}
						icon={TriangleAlert}
					/>
					<StatCard
						title={m.admin_catalog_reports_stat_out_of_stock()}
						value={formatNumber(inventory.outOfStock)}
						hint={m.admin_catalog_reports_stat_out_of_stock_hint()}
						icon={Package}
					/>
					<StatCard
						title={m.admin_catalog_reports_stat_variants()}
						value={formatNumber(inventory.variantCount)}
						hint={m.admin_catalog_reports_stat_variants_hint()}
						icon={TrendingUp}
					/>
				</div>

				<Card.Root>
					<Card.Header>
						<Card.Title>{m.admin_catalog_reports_bands_title()}</Card.Title>
						<Card.Description>{m.admin_catalog_reports_bands_description()}</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						{#each bandRows as row (row.key)}
							<div class="space-y-1.5">
								<div class="flex items-center justify-between gap-2 text-sm">
									<span class="font-medium">{row.label}</span>
									<span class="text-muted-foreground">
										{formatNumber(row.count)} · {formatPercent(row.percent / 100)}
									</span>
								</div>
								<Progress.Root value={row.percent} class="h-2" />
							</div>
						{/each}
					</Card.Content>
				</Card.Root>

				<div class="space-y-3">
					<div>
						<h2 class="text-lg font-semibold tracking-tight">
							{m.admin_catalog_reports_low_title()}
						</h2>
						<p class="text-sm text-muted-foreground">{m.admin_catalog_reports_low_description()}</p>
					</div>
					<DataTable
						columns={lowStockColumns}
						rows={lowStockRows as unknown as Record<string, unknown>[]}
						emptyMessage={m.admin_catalog_reports_low_empty()}
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
						<h2 class="text-lg font-semibold tracking-tight">
							{m.admin_catalog_reports_movements_title()}
						</h2>
						<p class="text-sm text-muted-foreground">
							{m.admin_catalog_reports_movements_description()}
						</p>
					</div>
					<DataTable
						columns={movementColumns}
						rows={movementRows as unknown as Record<string, unknown>[]}
						emptyMessage={m.admin_catalog_reports_movements_empty()}
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
										? 'font-semibold text-success'
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

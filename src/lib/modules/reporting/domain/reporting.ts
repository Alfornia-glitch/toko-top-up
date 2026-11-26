import type { Actor } from '#shared';

export type ReportedProductStatus = 'draft' | 'active' | 'archived';

export interface ReportedProduct {
	productId: string;
	sku: string;
	status: ReportedProductStatus;
	updatedAt: Date;
}

export interface CatalogStatusCount {
	status: ReportedProductStatus;
	count: number;
}

export interface CatalogStats {
	total: number;
	byStatus: CatalogStatusCount[];
	updatedAt: Date | null;
}

export interface CatalogSnapshot {
	total: number;
	active: number;
	draft: number;
	archived: number;
}

export interface ReportingRepository {
	upsertProduct(product: ReportedProduct): Promise<void>;
	getStats(): Promise<CatalogStats>;
}

/**
 * Reporting reads catalog data through its public API only. The adapter lives
 * in module.server.ts; the domain never imports catalog internals.
 */
export interface CatalogProductReader {
	countByStatus(actor: Actor): Promise<CatalogSnapshot>;
}

export interface DailySales {
	date: string;
	revenue: number;
	orders: number;
}

export interface SalesReport {
	from: string;
	to: string;
	revenue: number;
	orderCount: number;
	paidOrders: number;
	averageOrder: number;
	statusCounts: Record<string, number>;
	daily: DailySales[];
	topProducts: Array<{ name: string; sku: string; quantity: number; total: number }>;
}

export interface InventoryReport {
	variantCount: number;
	stockValue: number;
	outOfStock: number;
	lowStock: number;
	bands: { out: number; low: number; healthy: number };
	lowStockVariants: Array<{
		id: string;
		name: string;
		sku: string;
		stock: number;
		price: number;
		status: 'active' | 'inactive';
		productName: string;
	}>;
	recentMovements: Array<{ variantId: string; delta: number; entries: number }>;
}

export interface DashboardStats {
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
		placedAt: Date;
	}>;
	lowStock: Array<{ id: string; name: string; sku: string; stock: number }>;
}

export interface SalesInput {
	orders: Array<{ id: string; status: string; grandTotal: number; placedAt: Date }>;
	topProducts: SalesReport['topProducts'];
}

export interface CommerceReader {
	salesData(range: { start: Date; end: Date }, topLimit: number, actor: Actor): Promise<SalesInput>;
	orderTotals(actor: Actor): Promise<{
		orderCount: number;
		pendingCount: number;
		revenue: number;
	}>;
	recentOrders(limit: number, actor: Actor): Promise<DashboardStats['recentOrders']>;
	inventoryData(actor: Actor): Promise<{
		variants: InventoryReport['lowStockVariants'];
		recentMovements: InventoryReport['recentMovements'];
	}>;
	productCount(actor: Actor): Promise<number>;
	customerCount(actor: Actor): Promise<number>;
}

const PAID_STATUSES: readonly string[] = ['paid', 'processing', 'shipped', 'delivered'];
const LOW_STOCK_LEVEL = 5;
const DAY_MS = 86_400_000;

/** The reporting window: `to` defaults to now, `from` to 30 days before it. */
export function reportRange(now: Date, from?: string, to?: string): { start: Date; end: Date } {
	const end = to ? new Date(to) : now;
	const start = from ? new Date(from) : new Date(end.getTime() - 29 * DAY_MS);
	return { start, end };
}

export function buildSalesReport(
	range: { start: Date; end: Date },
	input: SalesInput
): SalesReport {
	let revenue = 0;
	let paidOrders = 0;
	const statusCounts: Record<string, number> = {};
	const daily = new Map<string, { revenue: number; orders: number }>();

	for (const order of input.orders) {
		statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
		const paid = PAID_STATUSES.includes(order.status);

		if (paid) {
			revenue += order.grandTotal;
			paidOrders += 1;
		}

		const day = new Date(order.placedAt).toISOString().slice(0, 10);
		const bucket = daily.get(day) ?? { revenue: 0, orders: 0 };
		bucket.orders += 1;
		if (paid) bucket.revenue += order.grandTotal;
		daily.set(day, bucket);
	}

	return {
		from: range.start.toISOString(),
		to: range.end.toISOString(),
		revenue,
		orderCount: input.orders.length,
		paidOrders,
		averageOrder: paidOrders ? Math.round(revenue / paidOrders) : 0,
		statusCounts,
		daily: [...daily.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, value]) => ({ date, ...value })),
		topProducts: input.topProducts
	};
}

export function buildInventoryReport(
	variants: InventoryReport['lowStockVariants'],
	recentMovements: InventoryReport['recentMovements']
): InventoryReport {
	let stockValue = 0;
	const bands = { out: 0, low: 0, healthy: 0 };

	for (const variant of variants) {
		stockValue += variant.stock * variant.price;
		if (variant.stock === 0) bands.out += 1;
		else if (variant.stock <= LOW_STOCK_LEVEL) bands.low += 1;
		else bands.healthy += 1;
	}

	return {
		variantCount: variants.length,
		stockValue,
		outOfStock: bands.out,
		lowStock: bands.low,
		bands,
		lowStockVariants: variants
			.filter((variant) => variant.stock <= LOW_STOCK_LEVEL)
			.sort((a, b) => a.stock - b.stock)
			.slice(0, 10),
		recentMovements
	};
}

export function lowStockOf(
	variants: InventoryReport['lowStockVariants'],
	limit: number
): { total: number; items: DashboardStats['lowStock'] } {
	const low = variants.filter((variant) => variant.stock <= LOW_STOCK_LEVEL);
	return {
		total: low.length,
		items: low
			.sort((a, b) => a.stock - b.stock)
			.slice(0, limit)
			.map(({ id, name, sku, stock }) => ({ id, name, sku, stock }))
	};
}

import { and, count, desc, eq, gte, inArray, lte, sum } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

const PAID = ['paid', 'processing', 'shipped', 'delivered'];

function range(from?: string, to?: string) {
	const end = to ? new Date(to) : new Date();
	const start = from ? new Date(from) : new Date(end.getTime() - 29 * 86400000);
	return { start, end };
}

export async function salesReport(from?: string, to?: string) {
	const { start, end } = range(from, to);

	const orders = await queryDb
		.select({
			id: t.orders.id,
			status: t.orders.status,
			grandTotalCents: t.orders.grandTotalCents,
			placedAt: t.orders.placedAt
		})
		.from(t.orders)
		.where(and(gte(t.orders.placedAt, start), lte(t.orders.placedAt, end)));

	let revenueCents = 0;
	let paidOrders = 0;
	const statusCounts: Record<string, number> = {};
	const daily = new Map<string, { revenueCents: number; orders: number }>();

	for (const order of orders) {
		statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;

		if (PAID.includes(order.status)) {
			revenueCents += order.grandTotalCents;
			paidOrders += 1;
		}

		const day = new Date(order.placedAt).toISOString().slice(0, 10);
		const bucket = daily.get(day) ?? { revenueCents: 0, orders: 0 };
		bucket.orders += 1;
		if (PAID.includes(order.status)) bucket.revenueCents += order.grandTotalCents;
		daily.set(day, bucket);
	}

	const topProducts = await queryDb
		.select({
			name: t.orderItems.productNameSnapshot,
			sku: t.orderItems.skuSnapshot,
			quantity: sum(t.orderItems.quantity),
			totalCents: sum(t.orderItems.totalCents)
		})
		.from(t.orderItems)
		.innerJoin(t.orders, eq(t.orderItems.orderId, t.orders.id))
		.where(
			and(
				gte(t.orders.placedAt, start),
				lte(t.orders.placedAt, end),
				inArray(t.orders.status, PAID)
			)
		)
		.groupBy(t.orderItems.productNameSnapshot, t.orderItems.skuSnapshot)
		.orderBy(desc(sum(t.orderItems.totalCents)))
		.limit(10);

	return {
		from: start.toISOString(),
		to: end.toISOString(),
		revenueCents,
		orderCount: orders.length,
		paidOrders,
		averageOrderCents: paidOrders ? Math.round(revenueCents / paidOrders) : 0,
		statusCounts,
		daily: [...daily.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, value]) => ({ date, ...value })),
		topProducts: topProducts.map((row: { quantity: unknown; totalCents: unknown }) => ({
			...row,
			quantity: Number(row.quantity ?? 0),
			totalCents: Number(row.totalCents ?? 0)
		}))
	};
}

export async function inventoryReport() {
	const variants = await queryDb
		.select({
			id: t.productVariants.id,
			name: t.productVariants.name,
			sku: t.productVariants.sku,
			stock: t.productVariants.stock,
			priceCents: t.productVariants.priceCents,
			status: t.productVariants.status,
			productName: t.products.name
		})
		.from(t.productVariants)
		.innerJoin(t.products, eq(t.productVariants.productId, t.products.id));

	let stockValueCents = 0;
	let outOfStock = 0;
	let lowStock = 0;
	const bands = { out: 0, low: 0, healthy: 0 };

	for (const variant of variants) {
		stockValueCents += variant.stock * variant.priceCents;
		if (variant.stock === 0) {
			outOfStock += 1;
			bands.out += 1;
		} else if (variant.stock <= 5) {
			lowStock += 1;
			bands.low += 1;
		} else {
			bands.healthy += 1;
		}
	}

	const recentMovements = await queryDb
		.select({
			variantId: t.inventoryMovements.variantId,
			delta: sum(t.inventoryMovements.delta),
			entries: count()
		})
		.from(t.inventoryMovements)
		.where(gte(t.inventoryMovements.createdAt, new Date(Date.now() - 30 * 86400000)))
		.groupBy(t.inventoryMovements.variantId)
		.orderBy(desc(sum(t.inventoryMovements.delta)))
		.limit(10);

	return {
		variantCount: variants.length,
		stockValueCents,
		outOfStock,
		lowStock,
		bands,
		lowStockVariants: variants
			.filter((variant: { stock: number }) => variant.stock <= 5)
			.sort((a: { stock: number }, b: { stock: number }) => a.stock - b.stock)
			.slice(0, 10),
		recentMovements: recentMovements.map((row: { delta: unknown; entries: unknown }) => ({
			...row,
			delta: Number(row.delta ?? 0),
			entries: Number(row.entries ?? 0)
		}))
	};
}

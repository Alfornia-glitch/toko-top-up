import { count, desc, eq, inArray, lte, sum } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';

const REVENUE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'] as const;

export async function getDashboardStats() {
	const [[products], [orders], [customers], [revenue], [pending], [lowStock]] = await Promise.all([
		queryDb.select({ value: count() }).from(tables.products),
		queryDb.select({ value: count() }).from(tables.orders),
		queryDb.select({ value: count() }).from(tables.user).where(eq(tables.user.role, 'customer')),
		queryDb
			.select({ value: sum(tables.orders.grandTotalCents) })
			.from(tables.orders)
			.where(inArray(tables.orders.status, [...REVENUE_STATUSES])),
		queryDb
			.select({ value: count() })
			.from(tables.orders)
			.where(eq(tables.orders.status, 'pending')),
		queryDb
			.select({ value: count() })
			.from(tables.productVariants)
			.where(lte(tables.productVariants.stock, 5))
	]);

	const recentOrders = await queryDb
		.select({
			id: tables.orders.id,
			orderNumber: tables.orders.orderNumber,
			status: tables.orders.status,
			paymentStatus: tables.orders.paymentStatus,
			grandTotalCents: tables.orders.grandTotalCents,
			currency: tables.orders.currency,
			placedAt: tables.orders.placedAt
		})
		.from(tables.orders)
		.orderBy(desc(tables.orders.placedAt))
		.limit(5);

	const lowStockVariants = await queryDb
		.select({
			id: tables.productVariants.id,
			name: tables.productVariants.name,
			sku: tables.productVariants.sku,
			stock: tables.productVariants.stock
		})
		.from(tables.productVariants)
		.where(lte(tables.productVariants.stock, 5))
		.orderBy(tables.productVariants.stock)
		.limit(5);

	return {
		products: Number(products?.value ?? 0),
		orders: Number(orders?.value ?? 0),
		customers: Number(customers?.value ?? 0),
		revenueCents: Number(revenue?.value ?? 0),
		pendingOrders: Number(pending?.value ?? 0),
		lowStockVariants: Number(lowStock?.value ?? 0),
		recentOrders,
		lowStock: lowStockVariants
	};
}

import { and, asc, count, desc, eq, gte, inArray, like, lte, or, sum, type SQL } from 'drizzle-orm';
import type { SqliteDb } from '#db/core.ts';
import { REVENUE_STATUSES, type OrderFilter, type OrdersRepository } from '../../domain/orders.ts';
import { orderEvents, orderItems, orders, payments, shipments } from './schema.ts';

const SORTABLE = {
	orderNumber: orders.orderNumber,
	status: orders.status,
	total: orders.grandTotalCents,
	placedAt: orders.placedAt,
	updatedAt: orders.updatedAt
} as const;

function whereFor(filter: OrderFilter): SQL | undefined {
	const conditions: SQL[] = [];

	if (filter.q) {
		const matches = [like(orders.orderNumber, `%${filter.q}%`)];
		if (filter.matchingUserIds.length) matches.push(inArray(orders.userId, filter.matchingUserIds));
		const search = or(...matches);
		if (search) conditions.push(search);
	}
	if (filter.status) conditions.push(eq(orders.status, filter.status as never));
	if (filter.paymentStatus) conditions.push(eq(orders.paymentStatus, filter.paymentStatus));
	if (filter.fulfillmentStatus) {
		conditions.push(eq(orders.fulfillmentStatus, filter.fulfillmentStatus));
	}

	return conditions.length ? and(...conditions) : undefined;
}

function orderBy(sort: string | undefined) {
	const raw = sort ?? '-placedAt';
	const key = raw.replace(/^-/, '') as keyof typeof SORTABLE;
	const column = SORTABLE[key] ?? orders.placedAt;
	return raw.startsWith('-') ? desc(column) : asc(column);
}

export function createSqliteOrdersRepository(db: SqliteDb): OrdersRepository {
	return {
		async listOrders(filter, page) {
			const where = whereFor(filter);
			const data = await db
				.select()
				.from(orders)
				.where(where)
				.orderBy(orderBy(filter.sort))
				.limit(page.pageSize)
				.offset((page.page - 1) * page.pageSize);
			const [row] = await db.select({ value: count() }).from(orders).where(where);
			return { data, total: Number(row?.value ?? 0) };
		},

		async findOrder(id) {
			const [row] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
			return row ?? null;
		},

		async findOrderForUser(userId, numberOrId) {
			const [row] = await db
				.select()
				.from(orders)
				.where(
					and(
						eq(orders.userId, userId),
						or(eq(orders.orderNumber, numberOrId), eq(orders.id, numberOrId))
					)
				)
				.limit(1);
			return row ?? null;
		},

		async listOrdersForUser(userId, page) {
			const data = await db
				.select()
				.from(orders)
				.where(eq(orders.userId, userId))
				.orderBy(desc(orders.placedAt))
				.limit(page.pageSize)
				.offset((page.page - 1) * page.pageSize);
			const [row] = await db
				.select({ value: count() })
				.from(orders)
				.where(eq(orders.userId, userId));
			return { data, total: Number(row?.value ?? 0) };
		},

		async countItemsByOrder(orderIds) {
			if (!orderIds.length) return new Map();
			const rows = await db
				.select({ orderId: orderItems.orderId, value: count() })
				.from(orderItems)
				.where(inArray(orderItems.orderId, orderIds))
				.groupBy(orderItems.orderId);
			return new Map(rows.map((row) => [row.orderId, Number(row.value)]));
		},

		async listItems(orderId) {
			return db
				.select()
				.from(orderItems)
				.where(eq(orderItems.orderId, orderId))
				.orderBy(asc(orderItems.id));
		},

		async listEvents(orderId) {
			return db
				.select()
				.from(orderEvents)
				.where(eq(orderEvents.orderId, orderId))
				.orderBy(desc(orderEvents.createdAt));
		},

		async listShipments(orderId) {
			return db
				.select()
				.from(shipments)
				.where(eq(shipments.orderId, orderId))
				.orderBy(desc(shipments.createdAt));
		},

		async listPayments(orderId) {
			return db
				.select()
				.from(payments)
				.where(eq(payments.orderId, orderId))
				.orderBy(desc(payments.createdAt));
		},

		// better-sqlite3 transactions are synchronous: no async callback, no await.
		async insertOrder(bundle) {
			db.transaction((tx) => {
				tx.insert(orders).values(bundle.order).run();
				if (bundle.items.length) tx.insert(orderItems).values(bundle.items).run();
				if (bundle.events.length) tx.insert(orderEvents).values(bundle.events).run();
				tx.insert(payments).values(bundle.payment).run();
			});
		},

		async updateOrder(id, patch, events) {
			db.transaction((tx) => {
				tx.update(orders).set(patch).where(eq(orders.id, id)).run();
				if (events.length) tx.insert(orderEvents).values(events).run();
			});
		},

		async insertShipment(shipment, orderPatch, event) {
			db.transaction((tx) => {
				tx.insert(shipments).values(shipment).run();
				tx.update(orders).set(orderPatch).where(eq(orders.id, shipment.orderId)).run();
				tx.insert(orderEvents).values(event).run();
			});
		},

		async updatePayments(orderId, patch) {
			await db.update(payments).set(patch).where(eq(payments.orderId, orderId));
		},

		async listSalesOrders(range) {
			return db
				.select({
					id: orders.id,
					status: orders.status,
					grandTotalCents: orders.grandTotalCents,
					placedAt: orders.placedAt
				})
				.from(orders)
				.where(and(gte(orders.placedAt, range.start), lte(orders.placedAt, range.end)));
		},

		async topProducts(range, limit) {
			const rows = await db
				.select({
					name: orderItems.productNameSnapshot,
					sku: orderItems.skuSnapshot,
					quantity: sum(orderItems.quantity),
					totalCents: sum(orderItems.totalCents)
				})
				.from(orderItems)
				.innerJoin(orders, eq(orderItems.orderId, orders.id))
				.where(
					and(
						gte(orders.placedAt, range.start),
						lte(orders.placedAt, range.end),
						inArray(orders.status, [...REVENUE_STATUSES])
					)
				)
				.groupBy(orderItems.productNameSnapshot, orderItems.skuSnapshot)
				.orderBy(desc(sum(orderItems.totalCents)))
				.limit(limit);

			return rows.map((row) => ({
				name: row.name,
				sku: row.sku,
				quantity: Number(row.quantity ?? 0),
				totalCents: Number(row.totalCents ?? 0)
			}));
		},

		async totals() {
			const [all] = await db.select({ value: count() }).from(orders);
			const [pending] = await db
				.select({ value: count() })
				.from(orders)
				.where(eq(orders.status, 'pending'));
			const [revenue] = await db
				.select({ value: sum(orders.grandTotalCents), paid: count() })
				.from(orders)
				.where(inArray(orders.status, [...REVENUE_STATUSES]));

			return {
				orderCount: Number(all?.value ?? 0),
				pendingCount: Number(pending?.value ?? 0),
				paidCount: Number(revenue?.paid ?? 0),
				revenueCents: Number(revenue?.value ?? 0)
			};
		},

		async productIdsWithItems(productIds) {
			const rows = await db
				.selectDistinct({ productId: orderItems.productId })
				.from(orderItems)
				.where(inArray(orderItems.productId, productIds));
			return rows.flatMap((row) => (row.productId ? [row.productId] : []));
		},

		async countForUser(userId) {
			const [row] = await db
				.select({ value: count() })
				.from(orders)
				.where(eq(orders.userId, userId));
			return Number(row?.value ?? 0);
		},

		async totalsForUsers(userIds) {
			const rows = await db
				.select({
					userId: orders.userId,
					orderCount: count(),
					spentCents: sum(orders.grandTotalCents)
				})
				.from(orders)
				.where(inArray(orders.userId, userIds))
				.groupBy(orders.userId);
			return rows.flatMap((row) =>
				row.userId
					? [
							{
								userId: row.userId,
								orderCount: Number(row.orderCount),
								spentCents: Number(row.spentCents ?? 0)
							}
						]
					: []
			);
		},

		async listAllForUser(userId) {
			return db
				.select()
				.from(orders)
				.where(eq(orders.userId, userId))
				.orderBy(desc(orders.placedAt));
		}
	};
}

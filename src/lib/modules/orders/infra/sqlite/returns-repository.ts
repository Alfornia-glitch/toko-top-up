import { and, desc, eq, inArray, like, or, count, type SQL } from 'drizzle-orm';
import type { SqliteDb } from '#db/core.ts';
import type { ReturnFilter, ReturnRow, ReturnsRepository } from '../../domain/returns.ts';
import { orderEvents, orderItems, orders, returnRequestImages, returnRequests } from './schema.ts';

const rowSelection = {
	id: returnRequests.id,
	orderId: returnRequests.orderId,
	orderItemId: returnRequests.orderItemId,
	userId: returnRequests.userId,
	type: returnRequests.type,
	reason: returnRequests.reason,
	note: returnRequests.note,
	status: returnRequests.status,
	resolution: returnRequests.resolution,
	refundAmountCents: returnRequests.refundAmountCents,
	exchangeVariantId: returnRequests.exchangeVariantId,
	pickupAddressJson: returnRequests.pickupAddressJson,
	resolvedBy: returnRequests.resolvedBy,
	resolvedAt: returnRequests.resolvedAt,
	createdAt: returnRequests.createdAt,
	updatedAt: returnRequests.updatedAt,
	orderNumber: orders.orderNumber,
	productName: orderItems.productNameSnapshot,
	sku: orderItems.skuSnapshot,
	quantity: orderItems.quantity,
	unitPriceCents: orderItems.unitPriceCents
};

function whereFor(filter: ReturnFilter): SQL | undefined {
	const conditions: SQL[] = [];

	if (filter.q) {
		const term = `%${filter.q}%`;
		const matches = [like(orders.orderNumber, term), like(orderItems.productNameSnapshot, term)];
		if (filter.matchingUserIds.length) {
			matches.push(inArray(returnRequests.userId, filter.matchingUserIds));
		}
		const search = or(...matches);
		if (search) conditions.push(search);
	}
	if (filter.status) conditions.push(eq(returnRequests.status, filter.status as never));
	if (filter.type) conditions.push(eq(returnRequests.type, filter.type));

	return conditions.length ? and(...conditions) : undefined;
}

export function createSqliteReturnsRepository(db: SqliteDb): ReturnsRepository {
	function joined() {
		return db
			.select(rowSelection)
			.from(returnRequests)
			.innerJoin(orders, eq(returnRequests.orderId, orders.id))
			.innerJoin(orderItems, eq(returnRequests.orderItemId, orderItems.id));
	}

	return {
		async listReturns(filter, page) {
			const where = whereFor(filter);
			const data: ReturnRow[] = await joined()
				.where(where)
				.orderBy(desc(returnRequests.createdAt))
				.limit(page.pageSize)
				.offset((page.page - 1) * page.pageSize);
			const [row] = await db
				.select({ value: count() })
				.from(returnRequests)
				.innerJoin(orders, eq(returnRequests.orderId, orders.id))
				.innerJoin(orderItems, eq(returnRequests.orderItemId, orderItems.id))
				.where(where);
			return { data, total: Number(row?.value ?? 0) };
		},

		async listReturnsForUser(userId) {
			return joined()
				.where(eq(returnRequests.userId, userId))
				.orderBy(desc(returnRequests.createdAt));
		},

		async findReturn(id) {
			const [row] = await joined().where(eq(returnRequests.id, id)).limit(1);
			return row ?? null;
		},

		async listImages(requestId) {
			return db
				.select()
				.from(returnRequestImages)
				.where(eq(returnRequestImages.requestId, requestId));
		},

		async findOrderIdForItem(userId, orderItemId) {
			const [row] = await db
				.select({ orderId: orderItems.orderId })
				.from(orderItems)
				.innerJoin(orders, eq(orderItems.orderId, orders.id))
				.where(and(eq(orderItems.id, orderItemId), eq(orders.userId, userId)))
				.limit(1);
			return row?.orderId ?? null;
		},

		async insertReturn(request) {
			await db.insert(returnRequests).values(request);
		},

		async updateReturn(id, patch, event) {
			// bun-sqlite transactions are synchronous: no async callback, no await.
			db.transaction((tx) => {
				tx.update(returnRequests).set(patch).where(eq(returnRequests.id, id)).run();
				tx.insert(orderEvents).values(event).run();
			});
		}
	};
}

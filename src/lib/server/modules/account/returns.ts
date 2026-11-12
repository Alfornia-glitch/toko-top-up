import { and, desc, eq } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import type { ReturnCreateInput } from '#lib/server/modules/customer/validation.ts';
import { NotFoundError } from '#shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

const returnSummarySelection = {
	id: t.returnRequests.id,
	orderId: t.returnRequests.orderId,
	orderNumber: t.orders.orderNumber,
	orderItemId: t.returnRequests.orderItemId,
	productName: t.orderItems.productNameSnapshot,
	sku: t.orderItems.skuSnapshot,
	type: t.returnRequests.type,
	reason: t.returnRequests.reason,
	status: t.returnRequests.status,
	resolution: t.returnRequests.resolution,
	refundAmountCents: t.returnRequests.refundAmountCents,
	createdAt: t.returnRequests.createdAt,
	updatedAt: t.returnRequests.updatedAt
};

export async function listReturns(userId: string) {
	return queryDb
		.select(returnSummarySelection)
		.from(t.returnRequests)
		.innerJoin(t.orders, eq(t.returnRequests.orderId, t.orders.id))
		.innerJoin(t.orderItems, eq(t.returnRequests.orderItemId, t.orderItems.id))
		.where(eq(t.returnRequests.userId, userId))
		.orderBy(desc(t.returnRequests.createdAt));
}

export async function getReturn(userId: string, id: string) {
	const [request] = await queryDb
		.select({ ...returnSummarySelection, note: t.returnRequests.note })
		.from(t.returnRequests)
		.innerJoin(t.orders, eq(t.returnRequests.orderId, t.orders.id))
		.innerJoin(t.orderItems, eq(t.returnRequests.orderItemId, t.orderItems.id))
		.where(and(eq(t.returnRequests.id, id), eq(t.returnRequests.userId, userId)))
		.limit(1);

	if (!request) return null;

	const images = await queryDb
		.select({ id: t.returnRequestImages.id, url: t.returnRequestImages.url })
		.from(t.returnRequestImages)
		.where(eq(t.returnRequestImages.requestId, id));

	return { ...request, images };
}

export async function createReturn(userId: string, input: ReturnCreateInput) {
	const [item] = await queryDb
		.select({ orderId: t.orderItems.orderId })
		.from(t.orderItems)
		.innerJoin(t.orders, eq(t.orderItems.orderId, t.orders.id))
		.where(and(eq(t.orderItems.id, input.orderItemId), eq(t.orders.userId, userId)))
		.limit(1);

	if (!item) throw new NotFoundError('Order item not found');

	const id = crypto.randomUUID();
	const now = new Date();

	await queryDb.insert(t.returnRequests).values({
		id,
		orderId: item.orderId,
		orderItemId: input.orderItemId,
		userId,
		type: input.type,
		reason: input.reason,
		note: input.note ?? null,
		status: 'requested',
		resolution: input.resolution ?? null,
		refundAmountCents: null,
		createdAt: now,
		updatedAt: now
	});

	return getReturn(userId, id);
}

import { and, count, desc, eq, like, or } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { UnprocessableError } from '#shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export const RETURNS_TRANSITIONS: Record<string, string[]> = {
	requested: ['approved', 'rejected'],
	approved: ['received', 'rejected'],
	received: ['refunded', 'completed'],
	rejected: [],
	refunded: ['completed'],
	completed: []
};

export async function listReturns(query: {
	page: number;
	pageSize: number;
	q?: string;
	status?: string;
	type?: 'return' | 'exchange';
}) {
	const conditions = [];

	if (query.q) {
		const term = `%${query.q}%`;
		conditions.push(
			or(
				like(t.orders.orderNumber, term),
				like(t.user.email, term),
				like(t.orderItems.productNameSnapshot, term)
			)
		);
	}

	if (query.status) conditions.push(eq(t.returnRequests.status, query.status));
	if (query.type) conditions.push(eq(t.returnRequests.type, query.type));

	const where = conditions.length ? and(...conditions) : undefined;
	const offset = (query.page - 1) * query.pageSize;

	const data = await queryDb
		.select({
			id: t.returnRequests.id,
			orderId: t.returnRequests.orderId,
			orderNumber: t.orders.orderNumber,
			orderItemId: t.returnRequests.orderItemId,
			productName: t.orderItems.productNameSnapshot,
			sku: t.orderItems.skuSnapshot,
			userId: t.returnRequests.userId,
			customerEmail: t.user.email,
			type: t.returnRequests.type,
			reason: t.returnRequests.reason,
			status: t.returnRequests.status,
			resolution: t.returnRequests.resolution,
			refundAmountCents: t.returnRequests.refundAmountCents,
			createdAt: t.returnRequests.createdAt,
			updatedAt: t.returnRequests.updatedAt
		})
		.from(t.returnRequests)
		.innerJoin(t.orders, eq(t.returnRequests.orderId, t.orders.id))
		.innerJoin(t.orderItems, eq(t.returnRequests.orderItemId, t.orderItems.id))
		.leftJoin(t.user, eq(t.returnRequests.userId, t.user.id))
		.where(where)
		.orderBy(desc(t.returnRequests.createdAt))
		.limit(query.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb
		.select({ value: count() })
		.from(t.returnRequests)
		.innerJoin(t.orders, eq(t.returnRequests.orderId, t.orders.id))
		.innerJoin(t.orderItems, eq(t.returnRequests.orderItemId, t.orderItems.id))
		.leftJoin(t.user, eq(t.returnRequests.userId, t.user.id))
		.where(where);

	return { data, page: query.page, pageSize: query.pageSize, total: Number(total ?? 0) };
}

export async function getReturn(id: string) {
	const [request] = await queryDb
		.select({
			id: t.returnRequests.id,
			orderId: t.returnRequests.orderId,
			orderNumber: t.orders.orderNumber,
			orderItemId: t.returnRequests.orderItemId,
			productName: t.orderItems.productNameSnapshot,
			sku: t.orderItems.skuSnapshot,
			quantity: t.orderItems.quantity,
			unitPriceCents: t.orderItems.unitPriceCents,
			userId: t.returnRequests.userId,
			customerName: t.user.name,
			customerEmail: t.user.email,
			type: t.returnRequests.type,
			reason: t.returnRequests.reason,
			note: t.returnRequests.note,
			status: t.returnRequests.status,
			resolution: t.returnRequests.resolution,
			refundAmountCents: t.returnRequests.refundAmountCents,
			exchangeVariantId: t.returnRequests.exchangeVariantId,
			pickupAddressJson: t.returnRequests.pickupAddressJson,
			resolvedBy: t.returnRequests.resolvedBy,
			resolvedAt: t.returnRequests.resolvedAt,
			createdAt: t.returnRequests.createdAt,
			updatedAt: t.returnRequests.updatedAt
		})
		.from(t.returnRequests)
		.innerJoin(t.orders, eq(t.returnRequests.orderId, t.orders.id))
		.innerJoin(t.orderItems, eq(t.returnRequests.orderItemId, t.orderItems.id))
		.leftJoin(t.user, eq(t.returnRequests.userId, t.user.id))
		.where(eq(t.returnRequests.id, id))
		.limit(1);

	if (!request) return null;

	const images = await queryDb
		.select()
		.from(t.returnRequestImages)
		.where(eq(t.returnRequestImages.requestId, id));

	return { ...request, images };
}

export async function updateReturn(
	id: string,
	input: {
		status?: string;
		resolution?: string | null;
		refundAmountCents?: number | null;
		exchangeVariantId?: string | null;
		note?: string | null;
	},
	actorId: string
) {
	const existing = await getReturn(id);
	if (!existing) return null;

	if (input.status && input.status !== existing.status) {
		const allowed = RETURNS_TRANSITIONS[existing.status] ?? [];
		if (!allowed.includes(input.status)) {
			throw new UnprocessableError(
				`Cannot move a return from "${existing.status}" to "${input.status}"`
			);
		}
	}

	const nextStatus = input.status ?? existing.status;
	const now = new Date();
	const resolved = ['rejected', 'refunded', 'completed'].includes(nextStatus);

	await queryDb.transaction(async (tx: any) => {
		await tx
			.update(t.returnRequests)
			.set({
				...(input.status ? { status: input.status } : {}),
				...(input.resolution !== undefined ? { resolution: input.resolution } : {}),
				...(input.refundAmountCents !== undefined
					? { refundAmountCents: input.refundAmountCents }
					: {}),
				...(input.exchangeVariantId !== undefined
					? { exchangeVariantId: input.exchangeVariantId }
					: {}),
				...(input.note !== undefined ? { note: input.note } : {}),
				...(resolved ? { resolvedBy: actorId, resolvedAt: now } : {}),
				updatedAt: now
			})
			.where(eq(t.returnRequests.id, id));

		await tx.insert(t.orderEvents).values({
			id: crypto.randomUUID(),
			orderId: existing.orderId,
			type: 'return_update',
			message: input.status
				? `Return ${existing.id} moved from ${existing.status} to ${input.status}`
				: `Return ${existing.id} updated`,
			actorUserId: actorId,
			createdAt: now
		});
	});

	return getReturn(id);
}

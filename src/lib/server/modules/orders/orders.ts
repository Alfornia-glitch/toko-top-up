import { and, asc, count, desc, eq, like, or } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { CatalogError } from '#lib/server/modules/catalog/errors.ts';
import type {
	OrderListQuery,
	OrderUpdateInput,
	ShipmentCreateInput
} from '#lib/server/modules/admin/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

const ORDER_TRANSITIONS: Record<string, string[]> = {
	pending: ['paid', 'cancelled'],
	paid: ['processing', 'cancelled', 'refunded'],
	processing: ['shipped', 'cancelled', 'refunded'],
	shipped: ['delivered', 'refunded'],
	delivered: ['refunded'],
	cancelled: [],
	refunded: []
};

export async function listOrders(query: OrderListQuery) {
	const conditions = [];

	if (query.q) {
		const term = `%${query.q}%`;
		conditions.push(
			or(like(t.orders.orderNumber, term), like(t.user.email, term), like(t.user.name, term))
		);
	}

	if (query.status) conditions.push(eq(t.orders.status, query.status));
	if (query.paymentStatus) conditions.push(eq(t.orders.paymentStatus, query.paymentStatus));
	if (query.fulfillmentStatus)
		conditions.push(eq(t.orders.fulfillmentStatus, query.fulfillmentStatus));

	const where = conditions.length ? and(...conditions) : undefined;
	const sortMap: Record<string, unknown> = {
		orderNumber: t.orders.orderNumber,
		status: t.orders.status,
		total: t.orders.grandTotalCents,
		placedAt: t.orders.placedAt,
		updatedAt: t.orders.updatedAt
	};
	const rawSort = query.sort ?? '-placedAt';
	const direction = rawSort.startsWith('-') ? 'desc' : 'asc';
	const sortColumn = sortMap[rawSort.replace(/^-/, '')] ?? t.orders.placedAt;
	const order = direction === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);
	const offset = (query.page - 1) * query.pageSize;

	const data = await queryDb
		.select({
			id: t.orders.id,
			orderNumber: t.orders.orderNumber,
			status: t.orders.status,
			paymentStatus: t.orders.paymentStatus,
			fulfillmentStatus: t.orders.fulfillmentStatus,
			grandTotalCents: t.orders.grandTotalCents,
			currency: t.orders.currency,
			placedAt: t.orders.placedAt,
			updatedAt: t.orders.updatedAt,
			customerName: t.user.name,
			customerEmail: t.user.email
		})
		.from(t.orders)
		.leftJoin(t.user, eq(t.orders.userId, t.user.id))
		.where(where)
		.orderBy(order)
		.limit(query.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb
		.select({ value: count() })
		.from(t.orders)
		.leftJoin(t.user, eq(t.orders.userId, t.user.id))
		.where(where);

	return { data, page: query.page, pageSize: query.pageSize, total: Number(total ?? 0) };
}

export async function getOrder(id: string) {
	const [order] = await queryDb
		.select({
			id: t.orders.id,
			orderNumber: t.orders.orderNumber,
			userId: t.orders.userId,
			status: t.orders.status,
			paymentStatus: t.orders.paymentStatus,
			fulfillmentStatus: t.orders.fulfillmentStatus,
			subtotalCents: t.orders.subtotalCents,
			discountCents: t.orders.discountCents,
			shippingCents: t.orders.shippingCents,
			taxCents: t.orders.taxCents,
			grandTotalCents: t.orders.grandTotalCents,
			currency: t.orders.currency,
			couponId: t.orders.couponId,
			shippingAddressJson: t.orders.shippingAddressJson,
			billingAddressJson: t.orders.billingAddressJson,
			trackingNumber: t.orders.trackingNumber,
			carrier: t.orders.carrier,
			estimatedDeliveryAt: t.orders.estimatedDeliveryAt,
			placedAt: t.orders.placedAt,
			notes: t.orders.notes,
			createdAt: t.orders.createdAt,
			updatedAt: t.orders.updatedAt,
			customerName: t.user.name,
			customerEmail: t.user.email
		})
		.from(t.orders)
		.leftJoin(t.user, eq(t.orders.userId, t.user.id))
		.where(eq(t.orders.id, id))
		.limit(1);

	if (!order) return null;

	const [items, events, shipments, payments] = await Promise.all([
		queryDb
			.select()
			.from(t.orderItems)
			.where(eq(t.orderItems.orderId, id))
			.orderBy(asc(t.orderItems.id)),
		queryDb
			.select()
			.from(t.orderEvents)
			.where(eq(t.orderEvents.orderId, id))
			.orderBy(desc(t.orderEvents.createdAt)),
		queryDb
			.select()
			.from(t.shipments)
			.where(eq(t.shipments.orderId, id))
			.orderBy(desc(t.shipments.createdAt)),
		queryDb
			.select()
			.from(t.payments)
			.where(eq(t.payments.orderId, id))
			.orderBy(desc(t.payments.createdAt))
	]);

	return {
		...order,
		customer: order.userId
			? { id: order.userId, name: order.customerName, email: order.customerEmail }
			: null,
		items,
		events,
		shipments,
		payments
	};
}

function assertTransition(from: string, to: string) {
	if (from === to) return;

	const allowed = ORDER_TRANSITIONS[from] ?? [];
	if (!allowed.includes(to)) {
		throw new CatalogError(422, `Cannot move an order from "${from}" to "${to}"`);
	}
}

export async function updateOrder(id: string, input: OrderUpdateInput, actorId: string) {
	const existing = await getOrder(id);
	if (!existing) return null;

	const now = new Date();
	const nextStatus = input.status ?? existing.status;
	assertTransition(existing.status, nextStatus);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const set: Record<string, any> = { updatedAt: now };

	if (input.status) set.status = input.status;
	if (input.paymentStatus) set.paymentStatus = input.paymentStatus;
	if (input.fulfillmentStatus) set.fulfillmentStatus = input.fulfillmentStatus;
	if (input.trackingNumber !== undefined) set.trackingNumber = input.trackingNumber;
	if (input.carrier !== undefined) set.carrier = input.carrier;
	if (input.estimatedDeliveryAt !== undefined) {
		set.estimatedDeliveryAt = input.estimatedDeliveryAt
			? new Date(input.estimatedDeliveryAt)
			: null;
	}

	if (input.status === 'paid' && !input.paymentStatus) set.paymentStatus = 'paid';
	if (input.status === 'refunded' && !input.paymentStatus) set.paymentStatus = 'refunded';

	await queryDb.transaction(async (tx: any) => {
		await tx.update(t.orders).set(set).where(eq(t.orders.id, id));

		if (input.status && input.status !== existing.status) {
			await tx.insert(t.orderEvents).values({
				id: crypto.randomUUID(),
				orderId: id,
				type: 'status_change',
				message: `Status changed from ${existing.status} to ${input.status}`,
				actorUserId: actorId,
				createdAt: now
			});
		}

		if (input.note) {
			await tx.insert(t.orderEvents).values({
				id: crypto.randomUUID(),
				orderId: id,
				type: 'note',
				message: input.note,
				actorUserId: actorId,
				createdAt: now
			});
		}
	});

	return getOrder(id);
}

export async function createShipment(id: string, input: ShipmentCreateInput, actorId: string) {
	const existing = await getOrder(id);
	if (!existing) return null;

	if (['pending', 'cancelled', 'refunded'].includes(existing.status)) {
		throw new CatalogError(422, `Cannot ship an order with status "${existing.status}"`);
	}

	const now = new Date();
	const shipmentId = crypto.randomUUID();

	await queryDb.transaction(async (tx: any) => {
		await tx.insert(t.shipments).values({
			id: shipmentId,
			orderId: id,
			carrier: input.carrier,
			trackingNumber: input.trackingNumber,
			status: 'shipped',
			shippedAt: now,
			eventsJson: [],
			createdAt: now,
			updatedAt: now
		});

		await tx
			.update(t.orders)
			.set({
				status: existing.status === 'delivered' ? 'delivered' : 'shipped',
				fulfillmentStatus: 'fulfilled',
				carrier: input.carrier,
				trackingNumber: input.trackingNumber,
				updatedAt: now
			})
			.where(eq(t.orders.id, id));

		await tx.insert(t.orderEvents).values({
			id: crypto.randomUUID(),
			orderId: id,
			type: 'shipment',
			message: `Shipped with ${input.carrier} (${input.trackingNumber})`,
			actorUserId: actorId,
			createdAt: now
		});
	});

	return { shipmentId, order: await getOrder(id) };
}

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
			throw new CatalogError(
				422,
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

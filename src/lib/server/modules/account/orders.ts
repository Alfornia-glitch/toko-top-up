import { and, count, desc, eq, inArray, or } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export interface OrderSummary {
	id: string;
	orderNumber: string;
	status: string;
	paymentStatus: string;
	fulfillmentStatus: string;
	grandTotalCents: number;
	currency: string;
	placedAt: Date;
	itemCount: number;
}

interface OrderRow {
	id: string;
	orderNumber: string;
	status: string;
	paymentStatus: string;
	fulfillmentStatus: string;
	grandTotalCents: number;
	currency: string;
	placedAt: Date;
}

export async function listOrders(userId: string, page: number, pageSize: number) {
	const offset = (page - 1) * pageSize;

	const rows: OrderRow[] = await queryDb
		.select({
			id: t.orders.id,
			orderNumber: t.orders.orderNumber,
			status: t.orders.status,
			paymentStatus: t.orders.paymentStatus,
			fulfillmentStatus: t.orders.fulfillmentStatus,
			grandTotalCents: t.orders.grandTotalCents,
			currency: t.orders.currency,
			placedAt: t.orders.placedAt
		})
		.from(t.orders)
		.where(eq(t.orders.userId, userId))
		.orderBy(desc(t.orders.placedAt))
		.limit(pageSize)
		.offset(offset);

	const orderIds = rows.map((row) => row.id);
	const counted: Array<{ orderId: string; value: unknown }> = orderIds.length
		? await queryDb
				.select({ orderId: t.orderItems.orderId, value: count() })
				.from(t.orderItems)
				.where(inArray(t.orderItems.orderId, orderIds))
				.groupBy(t.orderItems.orderId)
		: [];

	const itemCounts = new Map<string, number>(
		counted.map((row) => [row.orderId, Number(row.value ?? 0)])
	);

	const data: OrderSummary[] = rows.map((row) => ({
		...row,
		itemCount: itemCounts.get(row.id) ?? 0
	}));

	const [{ value: total }] = await queryDb
		.select({ value: count() })
		.from(t.orders)
		.where(eq(t.orders.userId, userId));

	return { data, page, pageSize, total: Number(total ?? 0) };
}

export async function getOrder(userId: string, numberOrId: string) {
	const [order] = await queryDb
		.select()
		.from(t.orders)
		.where(
			and(
				eq(t.orders.userId, userId),
				or(eq(t.orders.orderNumber, numberOrId), eq(t.orders.id, numberOrId))
			)
		)
		.limit(1);

	if (!order) return null;

	const [items, events, shipments] = await Promise.all([
		queryDb.select().from(t.orderItems).where(eq(t.orderItems.orderId, order.id)),
		queryDb
			.select()
			.from(t.orderEvents)
			.where(eq(t.orderEvents.orderId, order.id))
			.orderBy(desc(t.orderEvents.createdAt)),
		queryDb
			.select()
			.from(t.shipments)
			.where(eq(t.shipments.orderId, order.id))
			.orderBy(desc(t.shipments.createdAt))
	]);

	return {
		id: order.id,
		orderNumber: order.orderNumber,
		status: order.status,
		paymentStatus: order.paymentStatus,
		fulfillmentStatus: order.fulfillmentStatus,
		subtotalCents: order.subtotalCents,
		discountCents: order.discountCents,
		shippingCents: order.shippingCents,
		taxCents: order.taxCents,
		grandTotalCents: order.grandTotalCents,
		currency: order.currency,
		placedAt: order.placedAt,
		shippingAddress: order.shippingAddressJson ?? null,
		billingAddress: order.billingAddressJson ?? null,
		trackingNumber: order.trackingNumber ?? null,
		carrier: order.carrier ?? null,
		estimatedDeliveryAt: order.estimatedDeliveryAt ?? null,
		items: items.map((item: any) => ({
			id: item.id,
			productId: item.productId,
			variantId: item.variantId,
			productName: item.productNameSnapshot,
			sku: item.skuSnapshot,
			imageUrl: item.imageUrlSnapshot,
			quantity: item.quantity,
			unitPriceCents: item.unitPriceCents,
			totalCents: item.totalCents,
			status: item.status
		})),
		events: events.map((event: any) => ({
			id: event.id,
			type: event.type,
			message: event.message,
			createdAt: event.createdAt
		})),
		shipments: shipments.map((shipment: any) => ({
			id: shipment.id,
			carrier: shipment.carrier,
			trackingNumber: shipment.trackingNumber,
			status: shipment.status,
			shippedAt: shipment.shippedAt,
			deliveredAt: shipment.deliveredAt
		}))
	};
}

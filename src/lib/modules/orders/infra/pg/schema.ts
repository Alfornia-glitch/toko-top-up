import { index, integer, jsonb, pgSchema, text, timestamp } from 'drizzle-orm/pg-core';

const shop = pgSchema('shop');

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const orders = shop.table(
	'orders_orders',
	{
		id: text('id').primaryKey(),
		orderNumber: text('order_number').notNull().unique(),
		userId: text('user_id'),
		status: text('status')
			.$type<
				'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
			>()
			.notNull()
			.default('pending'),
		paymentStatus: text('payment_status').notNull().default('pending'),
		fulfillmentStatus: text('fulfillment_status').notNull().default('unfulfilled'),
		subtotalCents: integer('subtotal_cents').notNull().default(0),
		discountCents: integer('discount_cents').notNull().default(0),
		shippingCents: integer('shipping_cents').notNull().default(0),
		taxCents: integer('tax_cents').notNull().default(0),
		grandTotalCents: integer('grand_total_cents').notNull().default(0),
		currency: text('currency').notNull().default('USD'),
		couponId: text('coupon_id'),
		shippingAddressJson: jsonb('shipping_address_json').$type<Record<string, unknown>>(),
		billingAddressJson: jsonb('billing_address_json').$type<Record<string, unknown>>(),
		trackingNumber: text('tracking_number'),
		carrier: text('carrier'),
		estimatedDeliveryAt: timestamp('estimated_delivery_at', {
			withTimezone: true,
			mode: 'date'
		}),
		placedAt: timestamp('placed_at', { withTimezone: true, mode: 'date' }).notNull(),
		notes: text('notes'),
		...timestamps
	},
	(table) => [
		index('orders_orders_user_idx').on(table.userId),
		index('orders_orders_status_idx').on(table.status),
		index('orders_orders_placed_idx').on(table.placedAt)
	]
);

export const orderItems = shop.table(
	'orders_items',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		productId: text('product_id'),
		variantId: text('variant_id'),
		productNameSnapshot: text('product_name_snapshot').notNull(),
		skuSnapshot: text('sku_snapshot').notNull(),
		imageUrlSnapshot: text('image_url_snapshot'),
		quantity: integer('quantity').notNull().default(1),
		unitPriceCents: integer('unit_price_cents').notNull(),
		totalCents: integer('total_cents').notNull(),
		status: text('status').notNull().default('pending'),
		...timestamps
	},
	(table) => [index('orders_items_order_idx').on(table.orderId)]
);

export const orderEvents = shop.table(
	'orders_events',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		message: text('message'),
		actorUserId: text('actor_user_id'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [index('orders_events_order_idx').on(table.orderId)]
);

export const shipments = shop.table(
	'orders_shipments',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		carrier: text('carrier').notNull(),
		trackingNumber: text('tracking_number').notNull(),
		status: text('status').notNull().default('pending'),
		shippedAt: timestamp('shipped_at', { withTimezone: true, mode: 'date' }),
		deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'date' }),
		eventsJson: jsonb('events_json').$type<unknown[]>(),
		...timestamps
	},
	(table) => [index('orders_shipments_order_idx').on(table.orderId)]
);

export const payments = shop.table(
	'orders_payments',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		provider: text('provider').notNull(),
		providerRef: text('provider_ref'),
		amountCents: integer('amount_cents').notNull(),
		status: text('status')
			.$type<'pending' | 'succeeded' | 'failed' | 'refunded'>()
			.notNull()
			.default('pending'),
		paidAt: timestamp('paid_at', { withTimezone: true, mode: 'date' }),
		failureReason: text('failure_reason'),
		...timestamps
	},
	(table) => [index('orders_payments_order_idx').on(table.orderId)]
);

export const returnRequests = shop.table(
	'orders_returns',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		orderItemId: text('order_item_id')
			.notNull()
			.references(() => orderItems.id, { onDelete: 'cascade' }),
		userId: text('user_id').notNull(),
		type: text('type').$type<'return' | 'exchange'>().notNull(),
		reason: text('reason').notNull(),
		note: text('note'),
		status: text('status')
			.$type<'requested' | 'approved' | 'rejected' | 'received' | 'refunded' | 'completed'>()
			.notNull()
			.default('requested'),
		resolution: text('resolution').$type<'original_payment' | 'gift_card' | 'card'>(),
		refundAmountCents: integer('refund_amount_cents'),
		exchangeVariantId: text('exchange_variant_id'),
		pickupAddressJson: jsonb('pickup_address_json').$type<Record<string, unknown>>(),
		resolvedBy: text('resolved_by'),
		resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
		...timestamps
	},
	(table) => [
		index('orders_returns_status_idx').on(table.status),
		index('orders_returns_order_idx').on(table.orderId),
		index('orders_returns_user_idx').on(table.userId)
	]
);

export const returnRequestImages = shop.table(
	'orders_return_images',
	{
		id: text('id').primaryKey(),
		requestId: text('request_id')
			.notNull()
			.references(() => returnRequests.id, { onDelete: 'cascade' }),
		url: text('url').notNull()
	},
	(table) => [index('orders_return_images_request_idx').on(table.requestId)]
);

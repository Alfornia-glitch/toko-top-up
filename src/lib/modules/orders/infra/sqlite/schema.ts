import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const orders = sqliteTable(
	'orders_orders',
	{
		id: text('id').primaryKey(),
		orderNumber: text('order_number').notNull().unique(),
		userId: text('user_id'),
		status: text('status', {
			enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
		})
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
		shippingAddressJson: text('shipping_address_json', { mode: 'json' }).$type<
			Record<string, unknown>
		>(),
		billingAddressJson: text('billing_address_json', { mode: 'json' }).$type<
			Record<string, unknown>
		>(),
		trackingNumber: text('tracking_number'),
		carrier: text('carrier'),
		estimatedDeliveryAt: integer('estimated_delivery_at', { mode: 'timestamp_ms' }),
		placedAt: integer('placed_at', { mode: 'timestamp_ms' }).notNull(),
		notes: text('notes'),
		...timestamps
	},
	(table) => [
		index('orders_orders_user_idx').on(table.userId),
		index('orders_orders_status_idx').on(table.status),
		index('orders_orders_placed_idx').on(table.placedAt)
	]
);

export const orderItems = sqliteTable(
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

export const orderEvents = sqliteTable(
	'orders_events',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		message: text('message'),
		actorUserId: text('actor_user_id'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('orders_events_order_idx').on(table.orderId)]
);

export const shipments = sqliteTable(
	'orders_shipments',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		carrier: text('carrier').notNull(),
		trackingNumber: text('tracking_number').notNull(),
		status: text('status').notNull().default('pending'),
		shippedAt: integer('shipped_at', { mode: 'timestamp_ms' }),
		deliveredAt: integer('delivered_at', { mode: 'timestamp_ms' }),
		eventsJson: text('events_json', { mode: 'json' }).$type<unknown[]>(),
		...timestamps
	},
	(table) => [index('orders_shipments_order_idx').on(table.orderId)]
);

export const payments = sqliteTable(
	'orders_payments',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		provider: text('provider').notNull(),
		providerRef: text('provider_ref'),
		amountCents: integer('amount_cents').notNull(),
		status: text('status', { enum: ['pending', 'succeeded', 'failed', 'refunded'] })
			.notNull()
			.default('pending'),
		paidAt: integer('paid_at', { mode: 'timestamp_ms' }),
		failureReason: text('failure_reason'),
		...timestamps
	},
	(table) => [index('orders_payments_order_idx').on(table.orderId)]
);

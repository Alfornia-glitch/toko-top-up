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
		subtotal: integer('subtotal').notNull().default(0),
		discount: integer('discount').notNull().default(0),
		shipping: integer('shipping').notNull().default(0),
		tax: integer('tax').notNull().default(0),
		grandTotal: integer('grand_total').notNull().default(0),
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
		unitPrice: integer('unit_price').notNull(),
		total: integer('total').notNull(),
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
		amount: integer('amount').notNull(),
		status: text('status', { enum: ['pending', 'succeeded', 'failed', 'refunded'] })
			.notNull()
			.default('pending'),
		paidAt: integer('paid_at', { mode: 'timestamp_ms' }),
		failureReason: text('failure_reason'),
		...timestamps
	},
	(table) => [index('orders_payments_order_idx').on(table.orderId)]
);

export const returnRequests = sqliteTable(
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
		type: text('type', { enum: ['return', 'exchange'] }).notNull(),
		reason: text('reason').notNull(),
		note: text('note'),
		status: text('status', {
			enum: ['requested', 'approved', 'rejected', 'received', 'refunded', 'completed']
		})
			.notNull()
			.default('requested'),
		resolution: text('resolution', { enum: ['original_payment', 'gift_card', 'card'] }),
		refundAmount: integer('refund_amount'),
		exchangeVariantId: text('exchange_variant_id'),
		pickupAddressJson: text('pickup_address_json', { mode: 'json' }).$type<
			Record<string, unknown>
		>(),
		resolvedBy: text('resolved_by'),
		resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
		...timestamps
	},
	(table) => [
		index('orders_returns_status_idx').on(table.status),
		index('orders_returns_order_idx').on(table.orderId),
		index('orders_returns_user_idx').on(table.userId)
	]
);

export const returnRequestImages = sqliteTable(
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

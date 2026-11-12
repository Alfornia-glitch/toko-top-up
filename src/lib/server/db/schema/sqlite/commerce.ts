import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth.ts';
import { productVariants } from '#modules/catalog/infra/sqlite/schema.ts';
import { coupons } from '#modules/marketing/infra/sqlite/schema.ts';

const timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const orders = sqliteTable(
	'orders',
	{
		id: text('id').primaryKey(),
		orderNumber: text('order_number').notNull().unique(),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
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
		couponId: text('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
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
		index('orders_user_idx').on(table.userId),
		index('orders_status_idx').on(table.status),
		index('orders_placed_idx').on(table.placedAt)
	]
);

export const orderItems = sqliteTable(
	'order_items',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		productId: text('product_id'),
		variantId: text('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
		productNameSnapshot: text('product_name_snapshot').notNull(),
		skuSnapshot: text('sku_snapshot').notNull(),
		imageUrlSnapshot: text('image_url_snapshot'),
		quantity: integer('quantity').notNull().default(1),
		unitPriceCents: integer('unit_price_cents').notNull(),
		totalCents: integer('total_cents').notNull(),
		status: text('status').notNull().default('pending'),
		...timestamps
	},
	(table) => [index('order_items_order_idx').on(table.orderId)]
);

export const orderEvents = sqliteTable(
	'order_events',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		message: text('message'),
		actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('order_events_order_idx').on(table.orderId)]
);

export const shipments = sqliteTable(
	'shipments',
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
	(table) => [index('shipments_order_idx').on(table.orderId)]
);

export const payments = sqliteTable(
	'payments',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		provider: text('provider').notNull(),
		providerRef: text('provider_ref'),
		amountCents: integer('amount_cents').notNull(),
		status: text('status', {
			enum: ['pending', 'succeeded', 'failed', 'refunded']
		})
			.notNull()
			.default('pending'),
		paidAt: integer('paid_at', { mode: 'timestamp_ms' }),
		failureReason: text('failure_reason'),
		...timestamps
	},
	(table) => [index('payments_order_idx').on(table.orderId)]
);

export const returnRequests = sqliteTable(
	'return_requests',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		orderItemId: text('order_item_id')
			.notNull()
			.references(() => orderItems.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		type: text('type', { enum: ['return', 'exchange'] }).notNull(),
		reason: text('reason').notNull(),
		note: text('note'),
		status: text('status', {
			enum: ['requested', 'approved', 'rejected', 'received', 'refunded', 'completed']
		})
			.notNull()
			.default('requested'),
		resolution: text('resolution', { enum: ['original_payment', 'gift_card', 'card'] }),
		refundAmountCents: integer('refund_amount_cents'),
		exchangeVariantId: text('exchange_variant_id').references(() => productVariants.id, {
			onDelete: 'set null'
		}),
		pickupAddressJson: text('pickup_address_json', { mode: 'json' }).$type<
			Record<string, unknown>
		>(),
		resolvedBy: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
		resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
		...timestamps
	},
	(table) => [
		index('return_requests_status_idx').on(table.status),
		index('return_requests_order_idx').on(table.orderId)
	]
);

export const returnRequestImages = sqliteTable(
	'return_request_images',
	{
		id: text('id').primaryKey(),
		requestId: text('request_id')
			.notNull()
			.references(() => returnRequests.id, { onDelete: 'cascade' }),
		url: text('url').notNull()
	},
	(table) => [index('return_request_images_request_idx').on(table.requestId)]
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
	user: one(user, { fields: [orders.userId], references: [user.id] }),
	coupon: one(coupons, { fields: [orders.couponId], references: [coupons.id] }),
	items: many(orderItems),
	events: many(orderEvents),
	shipments: many(shipments),
	payments: many(payments)
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
	order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
	variant: one(productVariants, {
		fields: [orderItems.variantId],
		references: [productVariants.id]
	})
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
	order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
	actor: one(user, { fields: [orderEvents.actorUserId], references: [user.id] })
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
	order: one(orders, { fields: [shipments.orderId], references: [orders.id] })
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
	order: one(orders, { fields: [payments.orderId], references: [orders.id] })
}));

export const returnRequestsRelations = relations(returnRequests, ({ one, many }) => ({
	order: one(orders, { fields: [returnRequests.orderId], references: [orders.id] }),
	orderItem: one(orderItems, {
		fields: [returnRequests.orderItemId],
		references: [orderItems.id]
	}),
	user: one(user, { fields: [returnRequests.userId], references: [user.id] }),
	images: many(returnRequestImages)
}));

export const returnRequestImagesRelations = relations(returnRequestImages, ({ one }) => ({
	request: one(returnRequests, {
		fields: [returnRequestImages.requestId],
		references: [returnRequests.id]
	})
}));

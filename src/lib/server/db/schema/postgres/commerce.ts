import { relations } from 'drizzle-orm';
import { boolean, index, integer, jsonb, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './auth.ts';
import { productVariants } from '#modules/catalog/infra/pg/schema.ts';
import { coupons } from '#modules/marketing/infra/pg/schema.ts';
import { shopSchema } from './schema.ts';

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const carts = shopSchema.table(
	'carts',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		status: text('status')
			.$type<'active' | 'converted' | 'abandoned'>()
			.notNull()
			.default('active'),
		currency: text('currency').notNull().default('USD'),
		couponId: text('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
		...timestamps
	},
	(table) => [index('carts_user_idx').on(table.userId), index('carts_status_idx').on(table.status)]
);

export const cartItems = shopSchema.table(
	'cart_items',
	{
		id: text('id').primaryKey(),
		cartId: text('cart_id')
			.notNull()
			.references(() => carts.id, { onDelete: 'cascade' }),
		variantId: text('variant_id')
			.notNull()
			.references(() => productVariants.id, { onDelete: 'cascade' }),
		quantity: integer('quantity').notNull().default(1),
		unitPriceCents: integer('unit_price_cents').notNull(),
		...timestamps
	},
	(table) => [uniqueIndex('cart_items_cart_variant_idx').on(table.cartId, table.variantId)]
);

export const orders = shopSchema.table(
	'orders',
	{
		id: text('id').primaryKey(),
		orderNumber: text('order_number').notNull().unique(),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
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
		couponId: text('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
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
		index('orders_user_idx').on(table.userId),
		index('orders_status_idx').on(table.status),
		index('orders_placed_idx').on(table.placedAt)
	]
);

export const orderItems = shopSchema.table(
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

export const orderEvents = shopSchema.table(
	'order_events',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		message: text('message'),
		actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [index('order_events_order_idx').on(table.orderId)]
);

export const shipments = shopSchema.table(
	'shipments',
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
	(table) => [index('shipments_order_idx').on(table.orderId)]
);

export const payments = shopSchema.table(
	'payments',
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
	(table) => [index('payments_order_idx').on(table.orderId)]
);

export const returnRequests = shopSchema.table(
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
		type: text('type').$type<'return' | 'exchange'>().notNull(),
		reason: text('reason').notNull(),
		note: text('note'),
		status: text('status')
			.$type<'requested' | 'approved' | 'rejected' | 'received' | 'refunded' | 'completed'>()
			.notNull()
			.default('requested'),
		resolution: text('resolution').$type<'original_payment' | 'gift_card' | 'card'>(),
		refundAmountCents: integer('refund_amount_cents'),
		exchangeVariantId: text('exchange_variant_id').references(() => productVariants.id, {
			onDelete: 'set null'
		}),
		pickupAddressJson: jsonb('pickup_address_json').$type<Record<string, unknown>>(),
		resolvedBy: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
		resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
		...timestamps
	},
	(table) => [
		index('return_requests_status_idx').on(table.status),
		index('return_requests_order_idx').on(table.orderId)
	]
);

export const returnRequestImages = shopSchema.table(
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

export const cartsRelations = relations(carts, ({ one, many }) => ({
	user: one(user, { fields: [carts.userId], references: [user.id] }),
	coupon: one(coupons, { fields: [carts.couponId], references: [coupons.id] }),
	items: many(cartItems)
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
	cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
	variant: one(productVariants, {
		fields: [cartItems.variantId],
		references: [productVariants.id]
	})
}));

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

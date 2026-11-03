import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth.ts';
import { productVariants } from './catalog.ts';

const timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const addresses = sqliteTable(
	'addresses',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		label: text('label'),
		recipientName: text('recipient_name').notNull(),
		phone: text('phone'),
		line1: text('line1').notNull(),
		line2: text('line2'),
		city: text('city').notNull(),
		region: text('region'),
		postalCode: text('postal_code'),
		country: text('country').notNull(),
		isDefaultShipping: integer('is_default_shipping', { mode: 'boolean' }).notNull().default(false),
		isDefaultBilling: integer('is_default_billing', { mode: 'boolean' }).notNull().default(false),
		...timestamps
	},
	(table) => [index('addresses_user_idx').on(table.userId)]
);

export const coupons = sqliteTable(
	'coupons',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull().unique(),
		type: text('type', { enum: ['percentage', 'fixed'] }).notNull(),
		value: integer('value').notNull(),
		minSubtotalCents: integer('min_subtotal_cents').notNull().default(0),
		maxUses: integer('max_uses'),
		usedCount: integer('used_count').notNull().default(0),
		startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
		endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
		status: text('status', { enum: ['active', 'disabled'] })
			.notNull()
			.default('active'),
		appliesToJson: text('applies_to_json', { mode: 'json' }).$type<Record<string, unknown>>(),
		...timestamps
	},
	(table) => [index('coupons_status_idx').on(table.status)]
);

export const carts = sqliteTable(
	'carts',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		status: text('status', { enum: ['active', 'converted', 'abandoned'] })
			.notNull()
			.default('active'),
		currency: text('currency').notNull().default('USD'),
		couponId: text('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
		...timestamps
	},
	(table) => [index('carts_user_idx').on(table.userId), index('carts_status_idx').on(table.status)]
);

export const cartItems = sqliteTable(
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

export const paymentMethods = sqliteTable(
	'payment_methods',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		provider: text('provider').notNull(),
		brand: text('brand'),
		last4: text('last4'),
		expMonth: integer('exp_month'),
		expYear: integer('exp_year'),
		isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
		status: text('status', { enum: ['active', 'expired', 'removed'] })
			.notNull()
			.default('active'),
		...timestamps
	},
	(table) => [index('payment_methods_user_idx').on(table.userId)]
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

export const couponRedemptions = sqliteTable(
	'coupon_redemptions',
	{
		id: text('id').primaryKey(),
		couponId: text('coupon_id')
			.notNull()
			.references(() => coupons.id, { onDelete: 'cascade' }),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		amountCents: integer('amount_cents').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('coupon_redemptions_coupon_idx').on(table.couponId)]
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

export const giftCards = sqliteTable(
	'gift_cards',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull().unique(),
		initialAmountCents: integer('initial_amount_cents').notNull(),
		balanceCents: integer('balance_cents').notNull(),
		currency: text('currency').notNull().default('USD'),
		status: text('status', { enum: ['active', 'redeemed', 'expired', 'disabled'] })
			.notNull()
			.default('active'),
		recipientName: text('recipient_name'),
		recipientEmail: text('recipient_email'),
		purchaserUserId: text('purchaser_user_id').references(() => user.id, {
			onDelete: 'set null'
		}),
		orderId: text('order_id').references(() => orders.id, { onDelete: 'set null' }),
		message: text('message'),
		deliveredAt: integer('delivered_at', { mode: 'timestamp_ms' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
		...timestamps
	},
	(table) => [
		index('gift_cards_code_idx').on(table.code),
		index('gift_cards_status_idx').on(table.status)
	]
);

export const giftCardTransactions = sqliteTable(
	'gift_card_transactions',
	{
		id: text('id').primaryKey(),
		giftCardId: text('gift_card_id')
			.notNull()
			.references(() => giftCards.id, { onDelete: 'cascade' }),
		orderId: text('order_id').references(() => orders.id, { onDelete: 'set null' }),
		amountCents: integer('amount_cents').notNull(),
		type: text('type', { enum: ['issue', 'redeem', 'refund'] }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('gift_card_transactions_card_idx').on(table.giftCardId)]
);

export const newsletterSubscriptions = sqliteTable(
	'newsletter_subscriptions',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		email: text('email').notNull().unique(),
		preferencesJson: text('preferences_json', { mode: 'json' }).$type<Record<string, unknown>>(),
		status: text('status', { enum: ['subscribed', 'unsubscribed'] })
			.notNull()
			.default('subscribed'),
		source: text('source'),
		...timestamps
	},
	(table) => [index('newsletter_subscriptions_status_idx').on(table.status)]
);

export const supportTickets = sqliteTable(
	'support_tickets',
	{
		id: text('id').primaryKey(),
		ticketNumber: text('ticket_number').notNull().unique(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		orderId: text('order_id').references(() => orders.id, { onDelete: 'set null' }),
		subject: text('subject').notNull(),
		category: text('category').notNull(),
		priority: text('priority', { enum: ['low', 'normal', 'high', 'urgent'] })
			.notNull()
			.default('normal'),
		status: text('status', { enum: ['open', 'pending', 'resolved', 'closed'] })
			.notNull()
			.default('open'),
		assignedAdminId: text('assigned_admin_id').references(() => user.id, {
			onDelete: 'set null'
		}),
		...timestamps
	},
	(table) => [
		index('support_tickets_status_idx').on(table.status),
		index('support_tickets_assigned_idx').on(table.assignedAdminId)
	]
);

export const supportTicketMessages = sqliteTable(
	'support_ticket_messages',
	{
		id: text('id').primaryKey(),
		ticketId: text('ticket_id')
			.notNull()
			.references(() => supportTickets.id, { onDelete: 'cascade' }),
		senderUserId: text('sender_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		body: text('body').notNull(),
		attachmentsJson: text('attachments_json', { mode: 'json' }).$type<unknown[]>(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('support_ticket_messages_ticket_idx').on(table.ticketId)]
);

export const addressesRelations = relations(addresses, ({ one }) => ({
	user: one(user, { fields: [addresses.userId], references: [user.id] })
}));

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

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
	user: one(user, { fields: [paymentMethods.userId], references: [user.id] })
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
	order: one(orders, { fields: [payments.orderId], references: [orders.id] })
}));

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
	coupon: one(coupons, { fields: [couponRedemptions.couponId], references: [coupons.id] }),
	order: one(orders, { fields: [couponRedemptions.orderId], references: [orders.id] }),
	user: one(user, { fields: [couponRedemptions.userId], references: [user.id] })
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

export const giftCardsRelations = relations(giftCards, ({ one, many }) => ({
	purchaser: one(user, { fields: [giftCards.purchaserUserId], references: [user.id] }),
	order: one(orders, { fields: [giftCards.orderId], references: [orders.id] }),
	transactions: many(giftCardTransactions)
}));

export const giftCardTransactionsRelations = relations(giftCardTransactions, ({ one }) => ({
	giftCard: one(giftCards, {
		fields: [giftCardTransactions.giftCardId],
		references: [giftCards.id]
	}),
	order: one(orders, { fields: [giftCardTransactions.orderId], references: [orders.id] })
}));

export const newsletterSubscriptionsRelations = relations(newsletterSubscriptions, ({ one }) => ({
	user: one(user, { fields: [newsletterSubscriptions.userId], references: [user.id] })
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
	user: one(user, { fields: [supportTickets.userId], references: [user.id] }),
	order: one(orders, { fields: [supportTickets.orderId], references: [orders.id] }),
	assignedAdmin: one(user, {
		fields: [supportTickets.assignedAdminId],
		references: [user.id]
	}),
	messages: many(supportTicketMessages)
}));

export const supportTicketMessagesRelations = relations(supportTicketMessages, ({ one }) => ({
	ticket: one(supportTickets, {
		fields: [supportTicketMessages.ticketId],
		references: [supportTickets.id]
	}),
	sender: one(user, { fields: [supportTicketMessages.senderUserId], references: [user.id] })
}));

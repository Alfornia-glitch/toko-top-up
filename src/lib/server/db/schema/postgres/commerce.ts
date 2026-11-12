import { relations } from 'drizzle-orm';
import { boolean, index, integer, jsonb, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './auth.ts';
import { productVariants } from '#modules/catalog/infra/pg/schema.ts';
import { shopSchema } from './schema.ts';

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const addresses = shopSchema.table(
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
		isDefaultShipping: boolean('is_default_shipping').notNull().default(false),
		isDefaultBilling: boolean('is_default_billing').notNull().default(false),
		...timestamps
	},
	(table) => [index('addresses_user_idx').on(table.userId)]
);

export const coupons = shopSchema.table(
	'coupons',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull().unique(),
		type: text('type').$type<'percentage' | 'fixed'>().notNull(),
		value: integer('value').notNull(),
		minSubtotalCents: integer('min_subtotal_cents').notNull().default(0),
		maxUses: integer('max_uses'),
		usedCount: integer('used_count').notNull().default(0),
		startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }),
		endsAt: timestamp('ends_at', { withTimezone: true, mode: 'date' }),
		status: text('status').$type<'active' | 'disabled'>().notNull().default('active'),
		appliesToJson: jsonb('applies_to_json').$type<Record<string, unknown>>(),
		...timestamps
	},
	(table) => [index('coupons_status_idx').on(table.status)]
);

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

export const paymentMethods = shopSchema.table(
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
		isDefault: boolean('is_default').notNull().default(false),
		status: text('status').$type<'active' | 'expired' | 'removed'>().notNull().default('active'),
		...timestamps
	},
	(table) => [index('payment_methods_user_idx').on(table.userId)]
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

export const couponRedemptions = shopSchema.table(
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
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [index('coupon_redemptions_coupon_idx').on(table.couponId)]
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

export const giftCards = shopSchema.table(
	'gift_cards',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull().unique(),
		initialAmountCents: integer('initial_amount_cents').notNull(),
		balanceCents: integer('balance_cents').notNull(),
		currency: text('currency').notNull().default('USD'),
		status: text('status')
			.$type<'active' | 'redeemed' | 'expired' | 'disabled'>()
			.notNull()
			.default('active'),
		recipientName: text('recipient_name'),
		recipientEmail: text('recipient_email'),
		purchaserUserId: text('purchaser_user_id').references(() => user.id, {
			onDelete: 'set null'
		}),
		orderId: text('order_id').references(() => orders.id, { onDelete: 'set null' }),
		message: text('message'),
		deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'date' }),
		expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
		...timestamps
	},
	(table) => [
		index('gift_cards_code_idx').on(table.code),
		index('gift_cards_status_idx').on(table.status)
	]
);

export const giftCardTransactions = shopSchema.table(
	'gift_card_transactions',
	{
		id: text('id').primaryKey(),
		giftCardId: text('gift_card_id')
			.notNull()
			.references(() => giftCards.id, { onDelete: 'cascade' }),
		orderId: text('order_id').references(() => orders.id, { onDelete: 'set null' }),
		amountCents: integer('amount_cents').notNull(),
		type: text('type').$type<'issue' | 'redeem' | 'refund'>().notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [index('gift_card_transactions_card_idx').on(table.giftCardId)]
);

export const newsletterSubscriptions = shopSchema.table(
	'newsletter_subscriptions',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		email: text('email').notNull().unique(),
		preferencesJson: jsonb('preferences_json').$type<Record<string, unknown>>(),
		status: text('status').$type<'subscribed' | 'unsubscribed'>().notNull().default('subscribed'),
		source: text('source'),
		...timestamps
	},
	(table) => [index('newsletter_subscriptions_status_idx').on(table.status)]
);

export const supportTickets = shopSchema.table(
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
		priority: text('priority')
			.$type<'low' | 'normal' | 'high' | 'urgent'>()
			.notNull()
			.default('normal'),
		status: text('status')
			.$type<'open' | 'pending' | 'resolved' | 'closed'>()
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

export const supportTicketMessages = shopSchema.table(
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
		attachmentsJson: jsonb('attachments_json').$type<unknown[]>(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
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

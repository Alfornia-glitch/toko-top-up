import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const coupons = sqliteTable(
	'marketing_coupons',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull().unique(),
		type: text('type', { enum: ['percentage', 'fixed'] }).notNull(),
		value: integer('value').notNull(),
		minSubtotal: integer('min_subtotal').notNull().default(0),
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
	(table) => [index('marketing_coupons_status_idx').on(table.status)]
);

export const giftCards = sqliteTable(
	'marketing_gift_cards',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull().unique(),
		initialAmount: integer('initial_amount').notNull(),
		balance: integer('balance').notNull(),
		currency: text('currency').notNull().default('USD'),
		status: text('status', { enum: ['active', 'redeemed', 'expired', 'disabled'] })
			.notNull()
			.default('active'),
		recipientName: text('recipient_name'),
		recipientEmail: text('recipient_email'),
		purchaserUserId: text('purchaser_user_id'),
		orderId: text('order_id'),
		message: text('message'),
		deliveredAt: integer('delivered_at', { mode: 'timestamp_ms' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
		...timestamps
	},
	(table) => [
		index('marketing_gift_cards_code_idx').on(table.code),
		index('marketing_gift_cards_status_idx').on(table.status)
	]
);

export const giftCardTransactions = sqliteTable(
	'marketing_gift_card_transactions',
	{
		id: text('id').primaryKey(),
		giftCardId: text('gift_card_id')
			.notNull()
			.references(() => giftCards.id, { onDelete: 'cascade' }),
		orderId: text('order_id'),
		amount: integer('amount').notNull(),
		type: text('type', { enum: ['issue', 'redeem', 'refund'] }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('marketing_gift_card_transactions_card_idx').on(table.giftCardId)]
);

export const newsletterSubscriptions = sqliteTable(
	'marketing_newsletter_subscriptions',
	{
		id: text('id').primaryKey(),
		userId: text('user_id'),
		email: text('email').notNull().unique(),
		preferencesJson: text('preferences_json', { mode: 'json' }).$type<Record<string, unknown>>(),
		status: text('status', { enum: ['subscribed', 'unsubscribed'] })
			.notNull()
			.default('subscribed'),
		source: text('source'),
		...timestamps
	},
	(table) => [index('marketing_newsletter_subscriptions_status_idx').on(table.status)]
);

export const couponRedemptions = sqliteTable(
	'marketing_coupon_redemptions',
	{
		id: text('id').primaryKey(),
		couponId: text('coupon_id')
			.notNull()
			.references(() => coupons.id, { onDelete: 'cascade' }),
		orderId: text('order_id').notNull(),
		userId: text('user_id'),
		amount: integer('amount').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [
		index('marketing_coupon_redemptions_coupon_idx').on(table.couponId),
		uniqueIndex('marketing_coupon_redemptions_coupon_order_idx').on(table.couponId, table.orderId)
	]
);

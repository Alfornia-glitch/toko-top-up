import {
	foreignKey,
	index,
	integer,
	jsonb,
	pgSchema,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

const shop = pgSchema('shop');

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const coupons = shop.table(
	'marketing_coupons',
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
	(table) => [index('marketing_coupons_status_idx').on(table.status)]
);

export const giftCards = shop.table(
	'marketing_gift_cards',
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
		purchaserUserId: text('purchaser_user_id'),
		orderId: text('order_id'),
		message: text('message'),
		deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'date' }),
		expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
		...timestamps
	},
	(table) => [
		index('marketing_gift_cards_code_idx').on(table.code),
		index('marketing_gift_cards_status_idx').on(table.status)
	]
);

export const giftCardTransactions = shop.table(
	'marketing_gift_card_transactions',
	{
		id: text('id').primaryKey(),
		giftCardId: text('gift_card_id').notNull(),
		orderId: text('order_id'),
		amountCents: integer('amount_cents').notNull(),
		type: text('type').$type<'issue' | 'redeem' | 'refund'>().notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [
		index('marketing_gift_card_transactions_card_idx').on(table.giftCardId),
		// Explicit name: the generated one exceeds Postgres's 63-character identifier limit.
		foreignKey({
			name: 'marketing_gift_card_tx_gift_card_id_fk',
			columns: [table.giftCardId],
			foreignColumns: [giftCards.id]
		}).onDelete('cascade')
	]
);

export const newsletterSubscriptions = shop.table(
	'marketing_newsletter_subscriptions',
	{
		id: text('id').primaryKey(),
		userId: text('user_id'),
		email: text('email').notNull().unique(),
		preferencesJson: jsonb('preferences_json').$type<Record<string, unknown>>(),
		status: text('status').$type<'subscribed' | 'unsubscribed'>().notNull().default('subscribed'),
		source: text('source'),
		...timestamps
	},
	(table) => [index('marketing_newsletter_subscriptions_status_idx').on(table.status)]
);

export const couponRedemptions = shop.table(
	'marketing_coupon_redemptions',
	{
		id: text('id').primaryKey(),
		couponId: text('coupon_id')
			.notNull()
			.references(() => coupons.id, { onDelete: 'cascade' }),
		orderId: text('order_id').notNull(),
		userId: text('user_id'),
		amountCents: integer('amount_cents').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [
		index('marketing_coupon_redemptions_coupon_idx').on(table.couponId),
		uniqueIndex('marketing_coupon_redemptions_coupon_order_idx').on(table.couponId, table.orderId)
	]
);

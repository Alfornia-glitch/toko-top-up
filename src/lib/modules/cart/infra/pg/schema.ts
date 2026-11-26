import { index, integer, pgSchema, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

const shop = pgSchema('shop');

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const carts = shop.table(
	'cart_carts',
	{
		id: text('id').primaryKey(),
		userId: text('user_id'),
		status: text('status')
			.$type<'active' | 'converted' | 'abandoned'>()
			.notNull()
			.default('active'),
		currency: text('currency').notNull().default('USD'),
		couponId: text('coupon_id'),
		...timestamps
	},
	(table) => [
		index('cart_carts_user_idx').on(table.userId),
		index('cart_carts_status_idx').on(table.status)
	]
);

export const cartItems = shop.table(
	'cart_items',
	{
		id: text('id').primaryKey(),
		cartId: text('cart_id')
			.notNull()
			.references(() => carts.id, { onDelete: 'cascade' }),
		variantId: text('variant_id').notNull(),
		quantity: integer('quantity').notNull().default(1),
		unitPrice: integer('unit_price').notNull(),
		...timestamps
	},
	(table) => [uniqueIndex('cart_items_cart_variant_idx').on(table.cartId, table.variantId)]
);

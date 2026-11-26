import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const carts = sqliteTable(
	'cart_carts',
	{
		id: text('id').primaryKey(),
		userId: text('user_id'),
		status: text('status', { enum: ['active', 'converted', 'abandoned'] })
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

export const cartItems = sqliteTable(
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

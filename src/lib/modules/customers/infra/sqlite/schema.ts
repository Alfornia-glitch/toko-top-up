import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const addresses = sqliteTable(
	'customers_addresses',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull(),
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
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('customers_addresses_user_idx').on(table.userId)]
);

export const wishlists = sqliteTable(
	'customers_wishlists',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull(),
		productId: text('product_id').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [
		uniqueIndex('customers_wishlists_user_product_idx').on(table.userId, table.productId),
		index('customers_wishlists_product_idx').on(table.productId)
	]
);

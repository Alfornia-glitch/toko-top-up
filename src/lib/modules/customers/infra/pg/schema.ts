import {
	boolean,
	index,
	integer,
	pgSchema,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

const shop = pgSchema('shop');

export const addresses = shop.table(
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
		isDefaultShipping: boolean('is_default_shipping').notNull().default(false),
		isDefaultBilling: boolean('is_default_billing').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('customers_addresses_user_idx').on(table.userId)]
);

export const wishlists = shop.table(
	'customers_wishlists',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull(),
		productId: text('product_id').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [
		uniqueIndex('customers_wishlists_user_product_idx').on(table.userId, table.productId),
		index('customers_wishlists_product_idx').on(table.productId)
	]
);

export const paymentMethods = shop.table(
	'customers_payment_methods',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull(),
		provider: text('provider').notNull(),
		brand: text('brand'),
		last4: text('last4'),
		expMonth: integer('exp_month'),
		expYear: integer('exp_year'),
		isDefault: boolean('is_default').notNull().default(false),
		status: text('status').$type<'active' | 'expired' | 'removed'>().notNull().default('active'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('customers_payment_methods_user_idx').on(table.userId)]
);

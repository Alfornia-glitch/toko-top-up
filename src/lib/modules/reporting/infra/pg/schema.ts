import { index, pgSchema, text, timestamp } from 'drizzle-orm/pg-core';

const shop = pgSchema('shop');

export const catalogProducts = shop.table(
	'reporting_catalog_products',
	{
		productId: text('product_id').primaryKey(),
		sku: text('sku').notNull(),
		status: text('status').$type<'draft' | 'active' | 'archived'>().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [index('reporting_catalog_products_status_idx').on(table.status)]
);

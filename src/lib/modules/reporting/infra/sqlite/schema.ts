import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const catalogProducts = sqliteTable(
	'reporting_catalog_products',
	{
		productId: text('product_id').primaryKey(),
		sku: text('sku').notNull(),
		status: text('status', { enum: ['draft', 'active', 'archived'] }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('reporting_catalog_products_status_idx').on(table.status)]
);

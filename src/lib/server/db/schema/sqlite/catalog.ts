import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { products } from '#modules/catalog/infra/sqlite/schema.ts';
import { user } from './auth.ts';

/**
 * Legacy tables that still belong to modules which have not migrated yet.
 * `products` is imported from the catalog module so the temporary foreign
 * keys keep working until content/customers own these tables.
 */
export const reviews = sqliteTable(
	'reviews',
	{
		id: text('id').primaryKey(),
		productId: text('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		orderItemId: text('order_item_id'),
		rating: integer('rating').notNull(),
		title: text('title'),
		body: text('body'),
		status: text('status', { enum: ['pending', 'approved', 'rejected'] })
			.notNull()
			.default('pending'),
		helpfulCount: integer('helpful_count').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [
		index('reviews_product_idx').on(table.productId),
		index('reviews_status_idx').on(table.status)
	]
);

export const reviewImages = sqliteTable(
	'review_images',
	{
		id: text('id').primaryKey(),
		reviewId: text('review_id')
			.notNull()
			.references(() => reviews.id, { onDelete: 'cascade' }),
		url: text('url').notNull()
	},
	(table) => [index('review_images_review_idx').on(table.reviewId)]
);

export const wishlists = sqliteTable(
	'wishlists',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		productId: text('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [
		uniqueIndex('wishlists_user_product_idx').on(table.userId, table.productId),
		index('wishlists_product_idx').on(table.productId)
	]
);

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
	product: one(products, { fields: [reviews.productId], references: [products.id] }),
	user: one(user, { fields: [reviews.userId], references: [user.id] }),
	images: many(reviewImages)
}));

export const reviewImagesRelations = relations(reviewImages, ({ one }) => ({
	review: one(reviews, { fields: [reviewImages.reviewId], references: [reviews.id] })
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
	user: one(user, { fields: [wishlists.userId], references: [user.id] }),
	product: one(products, { fields: [wishlists.productId], references: [products.id] })
}));

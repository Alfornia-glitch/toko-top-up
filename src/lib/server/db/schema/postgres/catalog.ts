import { relations } from 'drizzle-orm';
import { index, integer, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { products } from '#modules/catalog/infra/pg/schema.ts';
import { user } from './auth.ts';
import { shopSchema } from './schema.ts';

/**
 * Legacy tables that still belong to modules which have not migrated yet.
 * `products` is imported from the catalog module so the temporary foreign
 * keys keep working until content/customers own these tables.
 */
export const reviews = shopSchema.table(
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
		status: text('status')
			.$type<'pending' | 'approved' | 'rejected'>()
			.notNull()
			.default('pending'),
		helpfulCount: integer('helpful_count').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [
		index('reviews_product_idx').on(table.productId),
		index('reviews_status_idx').on(table.status)
	]
);

export const reviewImages = shopSchema.table(
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

export const wishlists = shopSchema.table(
	'wishlists',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		productId: text('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
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

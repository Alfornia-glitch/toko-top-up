import { relations } from 'drizzle-orm';
import {
	type AnyPgColumn,
	boolean,
	index,
	integer,
	jsonb,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { user } from './auth.ts';
import { shopSchema } from './schema.ts';

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const brands = shopSchema.table(
	'brands',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		logoUrl: text('logo_url'),
		description: text('description'),
		status: text('status').$type<'active' | 'inactive'>().notNull().default('active'),
		...timestamps
	},
	(table) => [index('brands_status_idx').on(table.status)]
);

export const categories = shopSchema.table(
	'categories',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		parentId: text('parent_id').references((): AnyPgColumn => categories.id, {
			onDelete: 'set null'
		}),
		description: text('description'),
		imageUrl: text('image_url'),
		position: integer('position').notNull().default(0),
		status: text('status').$type<'active' | 'inactive'>().notNull().default('active'),
		...timestamps
	},
	(table) => [
		index('categories_parent_idx').on(table.parentId),
		index('categories_position_idx').on(table.position)
	]
);

export const products = shopSchema.table(
	'products',
	{
		id: text('id').primaryKey(),
		sku: text('sku').notNull().unique(),
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		description: text('description'),
		shortDescription: text('short_description'),
		brandId: text('brand_id').references(() => brands.id, { onDelete: 'set null' }),
		categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
		status: text('status').$type<'draft' | 'active' | 'archived'>().notNull().default('draft'),
		priceCents: integer('price_cents').notNull(),
		compareAtPriceCents: integer('compare_at_price_cents'),
		currency: text('currency').notNull().default('USD'),
		ratingAvg: integer('rating_avg').notNull().default(0),
		ratingCount: integer('rating_count').notNull().default(0),
		soldCount: integer('sold_count').notNull().default(0),
		isFeatured: boolean('is_featured').notNull().default(false),
		isNewArrival: boolean('is_new_arrival').notNull().default(false),
		isDeal: boolean('is_deal').notNull().default(false),
		dealEndsAt: timestamp('deal_ends_at', { withTimezone: true, mode: 'date' }),
		specsJson: jsonb('specs_json').$type<Record<string, unknown>>(),
		shippingInfo: text('shipping_info'),
		returnPolicy: text('return_policy'),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		...timestamps
	},
	(table) => [
		index('products_status_idx').on(table.status),
		index('products_category_idx').on(table.categoryId),
		index('products_brand_idx').on(table.brandId),
		index('products_slug_idx').on(table.slug)
	]
);

export const productImages = shopSchema.table(
	'product_images',
	{
		id: text('id').primaryKey(),
		productId: text('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		url: text('url').notNull(),
		path: text('path'),
		alt: text('alt'),
		position: integer('position').notNull().default(0),
		...timestamps
	},
	(table) => [index('product_images_product_idx').on(table.productId)]
);

export const productOptions = shopSchema.table(
	'product_options',
	{
		id: text('id').primaryKey(),
		productId: text('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		position: integer('position').notNull().default(0),
		...timestamps
	},
	(table) => [index('product_options_product_idx').on(table.productId)]
);

export const productOptionValues = shopSchema.table(
	'product_option_values',
	{
		id: text('id').primaryKey(),
		optionId: text('option_id')
			.notNull()
			.references(() => productOptions.id, { onDelete: 'cascade' }),
		value: text('value').notNull(),
		colorHex: text('color_hex'),
		position: integer('position').notNull().default(0),
		...timestamps
	},
	(table) => [index('product_option_values_option_idx').on(table.optionId)]
);

export const productVariants = shopSchema.table(
	'product_variants',
	{
		id: text('id').primaryKey(),
		productId: text('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		sku: text('sku').notNull().unique(),
		name: text('name').notNull(),
		priceCents: integer('price_cents').notNull(),
		compareAtPriceCents: integer('compare_at_price_cents'),
		stock: integer('stock').notNull().default(0),
		weightGrams: integer('weight_grams'),
		status: text('status').$type<'active' | 'inactive'>().notNull().default('active'),
		optionValuesJson: jsonb('option_values_json').$type<Record<string, string>>(),
		...timestamps
	},
	(table) => [index('product_variants_product_idx').on(table.productId)]
);

export const inventoryMovements = shopSchema.table(
	'inventory_movements',
	{
		id: text('id').primaryKey(),
		variantId: text('variant_id')
			.notNull()
			.references(() => productVariants.id, { onDelete: 'cascade' }),
		delta: integer('delta').notNull(),
		reason: text('reason').notNull(),
		referenceType: text('reference_type'),
		referenceId: text('reference_id'),
		adminUserId: text('admin_user_id').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [index('inventory_movements_variant_idx').on(table.variantId)]
);

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

export const brandsRelations = relations(brands, ({ many }) => ({
	products: many(products)
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
	parent: one(categories, {
		fields: [categories.parentId],
		references: [categories.id]
	}),
	children: many(categories),
	products: many(products)
}));

export const productsRelations = relations(products, ({ one, many }) => ({
	brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
	category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
	createdByUser: one(user, { fields: [products.createdBy], references: [user.id] }),
	images: many(productImages),
	options: many(productOptions),
	variants: many(productVariants),
	reviews: many(reviews)
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
	product: one(products, { fields: [productImages.productId], references: [products.id] })
}));

export const productOptionsRelations = relations(productOptions, ({ one, many }) => ({
	product: one(products, { fields: [productOptions.productId], references: [products.id] }),
	values: many(productOptionValues)
}));

export const productOptionValuesRelations = relations(productOptionValues, ({ one }) => ({
	option: one(productOptions, {
		fields: [productOptionValues.optionId],
		references: [productOptions.id]
	})
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
	product: one(products, { fields: [productVariants.productId], references: [products.id] }),
	inventoryMovements: many(inventoryMovements)
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
	variant: one(productVariants, {
		fields: [inventoryMovements.variantId],
		references: [productVariants.id]
	})
}));

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

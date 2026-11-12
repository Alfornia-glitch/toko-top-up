import { relations } from 'drizzle-orm';
import { type AnySQLiteColumn, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const brands = sqliteTable(
	'catalog_brands',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		logoUrl: text('logo_url'),
		description: text('description'),
		status: text('status', { enum: ['active', 'inactive'] })
			.notNull()
			.default('active'),
		...timestamps
	},
	(table) => [index('catalog_brands_status_idx').on(table.status)]
);

export const categories = sqliteTable(
	'catalog_categories',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		parentId: text('parent_id').references((): AnySQLiteColumn => categories.id, {
			onDelete: 'set null'
		}),
		description: text('description'),
		imageUrl: text('image_url'),
		position: integer('position').notNull().default(0),
		status: text('status', { enum: ['active', 'inactive'] })
			.notNull()
			.default('active'),
		...timestamps
	},
	(table) => [
		index('catalog_categories_parent_idx').on(table.parentId),
		index('catalog_categories_position_idx').on(table.position)
	]
);

export const products = sqliteTable(
	'catalog_products',
	{
		id: text('id').primaryKey(),
		sku: text('sku').notNull().unique(),
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		description: text('description'),
		shortDescription: text('short_description'),
		brandId: text('brand_id').references(() => brands.id, { onDelete: 'set null' }),
		categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
		status: text('status', { enum: ['draft', 'active', 'archived'] })
			.notNull()
			.default('draft'),
		priceCents: integer('price_cents').notNull(),
		compareAtPriceCents: integer('compare_at_price_cents'),
		currency: text('currency').notNull().default('USD'),
		ratingAvg: integer('rating_avg').notNull().default(0),
		ratingCount: integer('rating_count').notNull().default(0),
		soldCount: integer('sold_count').notNull().default(0),
		isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
		isNewArrival: integer('is_new_arrival', { mode: 'boolean' }).notNull().default(false),
		isDeal: integer('is_deal', { mode: 'boolean' }).notNull().default(false),
		dealEndsAt: integer('deal_ends_at', { mode: 'timestamp_ms' }),
		specsJson: text('specs_json', { mode: 'json' }).$type<Record<string, unknown>>(),
		shippingInfo: text('shipping_info'),
		returnPolicy: text('return_policy'),
		// Logical reference to identity until the identity module owns its schema.
		createdBy: text('created_by'),
		...timestamps
	},
	(table) => [
		index('catalog_products_status_idx').on(table.status),
		index('catalog_products_category_idx').on(table.categoryId),
		index('catalog_products_brand_idx').on(table.brandId),
		index('catalog_products_slug_idx').on(table.slug)
	]
);

export const productImages = sqliteTable(
	'catalog_product_images',
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
	(table) => [index('catalog_product_images_product_idx').on(table.productId)]
);

export const productOptions = sqliteTable(
	'catalog_product_options',
	{
		id: text('id').primaryKey(),
		productId: text('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		position: integer('position').notNull().default(0),
		...timestamps
	},
	(table) => [index('catalog_product_options_product_idx').on(table.productId)]
);

export const productOptionValues = sqliteTable(
	'catalog_product_option_values',
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
	(table) => [index('catalog_product_option_values_option_idx').on(table.optionId)]
);

export const productVariants = sqliteTable(
	'catalog_product_variants',
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
		status: text('status', { enum: ['active', 'inactive'] })
			.notNull()
			.default('active'),
		optionValuesJson: text('option_values_json', { mode: 'json' }).$type<Record<string, string>>(),
		...timestamps
	},
	(table) => [index('catalog_product_variants_product_idx').on(table.productId)]
);

export const inventoryMovements = sqliteTable(
	'catalog_inventory_movements',
	{
		id: text('id').primaryKey(),
		variantId: text('variant_id')
			.notNull()
			.references(() => productVariants.id, { onDelete: 'cascade' }),
		delta: integer('delta').notNull(),
		reason: text('reason').notNull(),
		referenceType: text('reference_type'),
		referenceId: text('reference_id'),
		// Logical reference to identity until the identity module owns its schema.
		adminUserId: text('admin_user_id'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('catalog_inventory_movements_variant_idx').on(table.variantId)]
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
	images: many(productImages),
	options: many(productOptions),
	variants: many(productVariants)
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

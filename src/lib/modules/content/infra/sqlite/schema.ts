import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const banners = sqliteTable(
	'content_banners',
	{
		id: text('id').primaryKey(),
		key: text('key', { enum: ['hero', 'promo', 'cta', 'category'] }).notNull(),
		title: text('title').notNull(),
		subtitle: text('subtitle'),
		imageUrl: text('image_url').notNull(),
		mobileImageUrl: text('mobile_image_url'),
		ctaLabel: text('cta_label'),
		ctaUrl: text('cta_url'),
		position: integer('position').notNull().default(0),
		active: integer('active', { mode: 'boolean' }).notNull().default(true),
		startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
		endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('content_banners_key_idx').on(table.key)]
);

export const announcements = sqliteTable(
	'content_announcements',
	{
		id: text('id').primaryKey(),
		text: text('text').notNull(),
		link: text('link'),
		position: integer('position').notNull().default(0),
		active: integer('active', { mode: 'boolean' }).notNull().default(true),
		startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
		endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('content_announcements_position_idx').on(table.position)]
);

export const testimonials = sqliteTable('content_testimonials', {
	id: text('id').primaryKey(),
	imageUrl: text('image_url').notNull(),
	caption: text('caption'),
	link: text('link'),
	position: integer('position').notNull().default(0),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull()
});

export const mediaAssets = sqliteTable(
	'content_media_assets',
	{
		id: text('id').primaryKey(),
		path: text('path').notNull().unique(),
		url: text('url').notNull(),
		contentType: text('content_type').notNull(),
		sizeBytes: integer('size_bytes').notNull(),
		folder: text('folder').notNull(),
		uploadedBy: text('uploaded_by'),
		alt: text('alt'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [
		index('content_media_assets_folder_idx').on(table.folder),
		index('content_media_assets_created_idx').on(table.createdAt)
	]
);

export const siteSettings = sqliteTable('content_site_settings', {
	key: text('key').primaryKey(),
	valueJson: text('value_json', { mode: 'json' }).$type<unknown>().notNull(),
	updatedBy: text('updated_by'),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull()
});

export const reviews = sqliteTable(
	'content_reviews',
	{
		id: text('id').primaryKey(),
		productId: text('product_id').notNull(),
		userId: text('user_id').notNull(),
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
		index('content_reviews_product_idx').on(table.productId),
		index('content_reviews_status_idx').on(table.status)
	]
);

export const reviewImages = sqliteTable(
	'content_review_images',
	{
		id: text('id').primaryKey(),
		reviewId: text('review_id')
			.notNull()
			.references(() => reviews.id, { onDelete: 'cascade' }),
		url: text('url').notNull()
	},
	(table) => [index('content_review_images_review_idx').on(table.reviewId)]
);

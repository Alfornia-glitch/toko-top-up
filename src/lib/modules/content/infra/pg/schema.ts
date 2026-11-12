import { boolean, index, integer, jsonb, pgSchema, text, timestamp } from 'drizzle-orm/pg-core';

const shop = pgSchema('shop');

export const banners = shop.table(
	'content_banners',
	{
		id: text('id').primaryKey(),
		key: text('key').$type<'hero' | 'promo' | 'cta' | 'category'>().notNull(),
		title: text('title').notNull(),
		subtitle: text('subtitle'),
		imageUrl: text('image_url').notNull(),
		mobileImageUrl: text('mobile_image_url'),
		ctaLabel: text('cta_label'),
		ctaUrl: text('cta_url'),
		position: integer('position').notNull().default(0),
		active: boolean('active').notNull().default(true),
		startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }),
		endsAt: timestamp('ends_at', { withTimezone: true, mode: 'date' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('content_banners_key_idx').on(table.key)]
);

export const announcements = shop.table(
	'content_announcements',
	{
		id: text('id').primaryKey(),
		text: text('text').notNull(),
		link: text('link'),
		position: integer('position').notNull().default(0),
		active: boolean('active').notNull().default(true),
		startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }),
		endsAt: timestamp('ends_at', { withTimezone: true, mode: 'date' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('content_announcements_position_idx').on(table.position)]
);

export const testimonials = shop.table('content_testimonials', {
	id: text('id').primaryKey(),
	imageUrl: text('image_url').notNull(),
	caption: text('caption'),
	link: text('link'),
	position: integer('position').notNull().default(0),
	active: boolean('active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.$onUpdate(() => new Date())
		.notNull()
});

export const mediaAssets = shop.table(
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
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [
		index('content_media_assets_folder_idx').on(table.folder),
		index('content_media_assets_created_idx').on(table.createdAt)
	]
);

export const siteSettings = shop.table('content_site_settings', {
	key: text('key').primaryKey(),
	valueJson: jsonb('value_json').$type<unknown>().notNull(),
	updatedBy: text('updated_by'),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.$onUpdate(() => new Date())
		.notNull()
});

import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth.ts';

export const banners = sqliteTable(
	'banners',
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
	(table) => [index('banners_key_idx').on(table.key)]
);

export const announcements = sqliteTable(
	'announcements',
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
	(table) => [index('announcements_position_idx').on(table.position)]
);

export const testimonials = sqliteTable('testimonials', {
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
	'media_assets',
	{
		id: text('id').primaryKey(),
		path: text('path').notNull().unique(),
		url: text('url').notNull(),
		contentType: text('content_type').notNull(),
		sizeBytes: integer('size_bytes').notNull(),
		folder: text('folder').notNull(),
		uploadedBy: text('uploaded_by').references(() => user.id, { onDelete: 'set null' }),
		alt: text('alt'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [
		index('media_assets_folder_idx').on(table.folder),
		index('media_assets_created_idx').on(table.createdAt)
	]
);

export const siteSettings = sqliteTable('site_settings', {
	key: text('key').primaryKey(),
	valueJson: text('value_json', { mode: 'json' }).$type<unknown>().notNull(),
	updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull()
});

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
	uploadedByUser: one(user, { fields: [mediaAssets.uploadedBy], references: [user.id] })
}));

export const siteSettingsRelations = relations(siteSettings, ({ one }) => ({
	updatedByUser: one(user, { fields: [siteSettings.updatedBy], references: [user.id] })
}));

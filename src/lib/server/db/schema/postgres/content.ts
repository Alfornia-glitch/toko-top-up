import { relations } from 'drizzle-orm';
import { boolean, index, integer, jsonb, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.ts';
import { shopSchema } from './schema.ts';

export const banners = shopSchema.table(
	'banners',
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
	(table) => [index('banners_key_idx').on(table.key)]
);

export const announcements = shopSchema.table(
	'announcements',
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
	(table) => [index('announcements_position_idx').on(table.position)]
);

export const testimonials = shopSchema.table('testimonials', {
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

export const mediaAssets = shopSchema.table(
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
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [
		index('media_assets_folder_idx').on(table.folder),
		index('media_assets_created_idx').on(table.createdAt)
	]
);

export const siteSettings = shopSchema.table('site_settings', {
	key: text('key').primaryKey(),
	valueJson: jsonb('value_json').$type<unknown>().notNull(),
	updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.$onUpdate(() => new Date())
		.notNull()
});

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
	uploadedByUser: one(user, { fields: [mediaAssets.uploadedBy], references: [user.id] })
}));

export const siteSettingsRelations = relations(siteSettings, ({ one }) => ({
	updatedByUser: one(user, { fields: [siteSettings.updatedBy], references: [user.id] })
}));

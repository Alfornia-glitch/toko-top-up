import { and, asc, count, desc, eq, like, or, sum } from 'drizzle-orm';
import type { SqliteDb } from '#db/core.ts';
import type {
	ContentItem,
	ContentKind,
	ContentRepository,
	MediaListQuery
} from '../../domain/content.ts';
import { announcements, banners, mediaAssets, siteSettings, testimonials } from './schema.ts';

// Banners, announcements and testimonials share the columns the repository touches
// (id, position, active, createdAt); the cast lets one code path serve all three.
type ItemTable = typeof testimonials;

const ITEM_TABLES: Record<ContentKind, ItemTable> = {
	banners: banners as unknown as ItemTable,
	announcements: announcements as unknown as ItemTable,
	testimonials
};

export function createSqliteContentRepository(db: SqliteDb): ContentRepository {
	return {
		async listItems(kind) {
			const table = ITEM_TABLES[kind];
			const rows = await db.select().from(table).orderBy(asc(table.position), asc(table.createdAt));
			return rows as ContentItem[];
		},

		async listActiveItems(kind) {
			const table = ITEM_TABLES[kind];
			const rows = await db
				.select()
				.from(table)
				.where(eq(table.active, true))
				.orderBy(asc(table.position));
			return rows as ContentItem[];
		},

		async findItem(kind, id) {
			const table = ITEM_TABLES[kind];
			const [row] = await db.select().from(table).where(eq(table.id, id)).limit(1);
			return (row as ContentItem | undefined) ?? null;
		},

		async insertItem(kind, values) {
			await db.insert(ITEM_TABLES[kind]).values(values as typeof testimonials.$inferInsert);
		},

		async updateItem(kind, id, values) {
			const table = ITEM_TABLES[kind];
			await db
				.update(table)
				.set(values as Partial<typeof testimonials.$inferInsert>)
				.where(eq(table.id, id));
		},

		async deleteItem(kind, id) {
			const table = ITEM_TABLES[kind];
			await db.delete(table).where(eq(table.id, id));
		},

		async listMedia(query: MediaListQuery) {
			const conditions = [];
			if (query.q) {
				const term = `%${query.q}%`;
				conditions.push(or(like(mediaAssets.path, term), like(mediaAssets.alt, term)));
			}
			if (query.folder) conditions.push(eq(mediaAssets.folder, query.folder));
			const where = conditions.length ? and(...conditions) : undefined;

			const data = await db
				.select()
				.from(mediaAssets)
				.where(where)
				.orderBy(desc(mediaAssets.createdAt))
				.limit(query.pageSize)
				.offset((query.page - 1) * query.pageSize);
			const [row] = await db.select({ value: count() }).from(mediaAssets).where(where);

			return { data, total: Number(row?.value ?? 0) };
		},

		async insertMedia(asset) {
			await db.insert(mediaAssets).values(asset);
		},

		async findMedia(id) {
			const [row] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
			return row ?? null;
		},

		async deleteMedia(id) {
			await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
		},

		async mediaStats() {
			const [totals] = await db
				.select({ assets: count(), bytes: sum(mediaAssets.sizeBytes) })
				.from(mediaAssets);
			const folders = await db
				.select({
					folder: mediaAssets.folder,
					assets: count(),
					bytes: sum(mediaAssets.sizeBytes)
				})
				.from(mediaAssets)
				.groupBy(mediaAssets.folder);
			const recent = await db
				.select({
					id: mediaAssets.id,
					url: mediaAssets.url,
					path: mediaAssets.path,
					folder: mediaAssets.folder,
					sizeBytes: mediaAssets.sizeBytes,
					createdAt: mediaAssets.createdAt
				})
				.from(mediaAssets)
				.orderBy(desc(mediaAssets.createdAt))
				.limit(12);

			return {
				assets: Number(totals?.assets ?? 0),
				bytes: Number(totals?.bytes ?? 0),
				folders: folders.map((row) => ({
					folder: row.folder,
					assets: Number(row.assets),
					bytes: Number(row.bytes ?? 0)
				})),
				recent
			};
		},

		async listSettings() {
			return db.select().from(siteSettings).orderBy(asc(siteSettings.key));
		},

		async upsertSetting(setting) {
			await db
				.insert(siteSettings)
				.values(setting)
				.onConflictDoUpdate({
					target: siteSettings.key,
					set: {
						valueJson: setting.valueJson,
						updatedBy: setting.updatedBy,
						updatedAt: setting.updatedAt
					}
				});
		},

		async deleteSetting(key) {
			const deleted = await db
				.delete(siteSettings)
				.where(eq(siteSettings.key, key))
				.returning({ key: siteSettings.key });
			return deleted.length > 0;
		}
	};
}

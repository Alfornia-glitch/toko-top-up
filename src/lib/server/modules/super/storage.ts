import { count, desc, sum } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function storageStats() {
	const [totals] = await queryDb
		.select({ assets: count(), bytes: sum(t.mediaAssets.sizeBytes) })
		.from(t.mediaAssets);

	const folders = await queryDb
		.select({
			folder: t.mediaAssets.folder,
			assets: count(),
			bytes: sum(t.mediaAssets.sizeBytes)
		})
		.from(t.mediaAssets)
		.groupBy(t.mediaAssets.folder);

	const recent = await queryDb
		.select({
			id: t.mediaAssets.id,
			url: t.mediaAssets.url,
			path: t.mediaAssets.path,
			folder: t.mediaAssets.folder,
			sizeBytes: t.mediaAssets.sizeBytes,
			createdAt: t.mediaAssets.createdAt
		})
		.from(t.mediaAssets)
		.orderBy(desc(t.mediaAssets.createdAt))
		.limit(12);

	return {
		assets: Number(totals?.assets ?? 0),
		bytes: Number(totals?.bytes ?? 0),
		folders: folders.map((row: { assets: unknown; bytes: unknown }) => ({
			...row,
			assets: Number(row.assets ?? 0),
			bytes: Number(row.bytes ?? 0)
		})),
		recent
	};
}

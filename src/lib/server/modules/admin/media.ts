import { and, count, desc, eq, like, or } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { deleteMedia, type UploadedMedia } from '#lib/server/modules/storage/index.ts';
import type { MediaListQuery } from './validation.ts';

export async function listMedia(params: MediaListQuery) {
	const conditions = [];

	if (params.q) {
		const term = `%${params.q}%`;
		conditions.push(or(like(tables.mediaAssets.path, term), like(tables.mediaAssets.alt, term)));
	}

	if (params.folder) {
		conditions.push(eq(tables.mediaAssets.folder, params.folder));
	}

	const where = conditions.length ? and(...conditions) : undefined;
	const offset = (params.page - 1) * params.pageSize;

	const data = await queryDb
		.select()
		.from(tables.mediaAssets)
		.where(where)
		.orderBy(desc(tables.mediaAssets.createdAt))
		.limit(params.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb
		.select({ value: count() })
		.from(tables.mediaAssets)
		.where(where);

	return {
		data,
		page: params.page,
		pageSize: params.pageSize,
		total: Number(total ?? 0)
	};
}

export async function createMediaAsset(
	upload: UploadedMedia,
	folder: string,
	uploadedBy: string
): Promise<string> {
	const id = crypto.randomUUID();

	await queryDb.insert(tables.mediaAssets).values({
		id,
		path: upload.path,
		url: upload.url,
		contentType: upload.contentType,
		sizeBytes: upload.size,
		folder,
		uploadedBy,
		createdAt: new Date()
	});

	return id;
}

export async function findMediaAsset(id: string) {
	const [asset] = await queryDb
		.select()
		.from(tables.mediaAssets)
		.where(eq(tables.mediaAssets.id, id))
		.limit(1);

	return asset ?? null;
}

export async function deleteMediaAsset(id: string) {
	const asset = await findMediaAsset(id);
	if (!asset) return null;

	await deleteMedia(asset.path);

	await queryDb.delete(tables.mediaAssets).where(eq(tables.mediaAssets.id, id));

	return asset;
}

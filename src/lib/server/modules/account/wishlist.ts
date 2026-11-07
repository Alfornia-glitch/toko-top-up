import { and, desc, eq } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { CatalogError } from '#lib/server/modules/catalog/errors.ts';
import { listPublicProductsByIds } from '#lib/server/modules/storefront/catalog.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

async function findOwnedWishlist(userId: string, productId: string) {
	const [row] = await queryDb
		.select()
		.from(t.wishlists)
		.where(and(eq(t.wishlists.userId, userId), eq(t.wishlists.productId, productId)))
		.limit(1);

	return row ?? null;
}

export async function listWishlist(userId: string) {
	const rows = await queryDb
		.select({ productId: t.wishlists.productId, createdAt: t.wishlists.createdAt })
		.from(t.wishlists)
		.where(eq(t.wishlists.userId, userId))
		.orderBy(desc(t.wishlists.createdAt));

	const products = await listPublicProductsByIds(rows.map((row) => row.productId));
	const byId = new Map(products.map((product) => [product.id, product]));

	return rows.flatMap((row) => {
		const product = byId.get(row.productId);
		return product ? [{ ...product, wishlistedAt: row.createdAt }] : [];
	});
}

export async function addWishlist(userId: string, productId: string) {
	const [product] = await queryDb
		.select({ id: t.products.id })
		.from(t.products)
		.where(and(eq(t.products.id, productId), eq(t.products.status, 'active')))
		.limit(1);

	if (!product) throw new CatalogError(404, 'Product not found');

	const existing = await findOwnedWishlist(userId, productId);
	if (existing) return existing;

	const now = new Date();
	const values = {
		id: crypto.randomUUID(),
		userId,
		productId,
		createdAt: now
	};

	await queryDb.insert(t.wishlists).values(values).onConflictDoNothing();

	return findOwnedWishlist(userId, productId);
}

export async function removeWishlist(userId: string, productId: string) {
	const existing = await findOwnedWishlist(userId, productId);
	if (!existing) return false;

	await queryDb
		.delete(t.wishlists)
		.where(and(eq(t.wishlists.userId, userId), eq(t.wishlists.productId, productId)));

	return true;
}

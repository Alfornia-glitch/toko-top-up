import { and, eq } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { getRuntime } from '#lib/server/runtime.server.ts';
import { listPublicProductsByIds } from '#lib/server/modules/storefront/catalog.ts';
import { NotFoundError, unwrap, type Actor } from '#shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

function customers() {
	return getRuntime().services.customers.customers;
}

export async function listWishlist(actor: Actor | null) {
	const rows = unwrap(await customers().listWishlist(actor));

	const products = await listPublicProductsByIds(rows.map((row) => row.productId));
	const byId = new Map(products.map((product) => [product.id, product]));

	return rows.flatMap((row) => {
		const product = byId.get(row.productId);
		return product ? [{ ...product, wishlistedAt: row.createdAt }] : [];
	});
}

export async function addWishlist(actor: Actor | null, productId: string) {
	const [product] = await queryDb
		.select({ id: t.products.id })
		.from(t.products)
		.where(and(eq(t.products.id, productId), eq(t.products.status, 'active')))
		.limit(1);

	if (!product) throw new NotFoundError('Product not found');

	return unwrap(await customers().addWishlist(productId, actor));
}

export async function removeWishlist(actor: Actor | null, productId: string) {
	unwrap(await customers().removeWishlist(productId, actor));
}

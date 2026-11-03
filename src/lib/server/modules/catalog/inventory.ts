import { and, asc, count, desc, eq, like, lte, or } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { CatalogError } from './errors.ts';
import type {
	InventoryListQuery,
	MovementListQuery,
	StockAdjustInput
} from '#lib/server/modules/admin/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function listInventory(query: InventoryListQuery) {
	const conditions = [];

	if (query.q) {
		const term = `%${query.q}%`;
		conditions.push(
			or(
				like(t.productVariants.name, term),
				like(t.productVariants.sku, term),
				like(t.products.name, term),
				like(t.products.sku, term)
			)
		);
	}

	if (query.lowStock) conditions.push(lte(t.productVariants.stock, 5));
	if (query.variantId) conditions.push(eq(t.productVariants.id, query.variantId));

	const where = conditions.length ? and(...conditions) : undefined;
	const offset = (query.page - 1) * query.pageSize;

	const data = await queryDb
		.select({
			id: t.productVariants.id,
			sku: t.productVariants.sku,
			name: t.productVariants.name,
			stock: t.productVariants.stock,
			status: t.productVariants.status,
			priceCents: t.productVariants.priceCents,
			productId: t.products.id,
			productName: t.products.name,
			productSku: t.products.sku
		})
		.from(t.productVariants)
		.innerJoin(t.products, eq(t.productVariants.productId, t.products.id))
		.where(where)
		.orderBy(asc(t.productVariants.stock), asc(t.productVariants.name))
		.limit(query.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb
		.select({ value: count() })
		.from(t.productVariants)
		.innerJoin(t.products, eq(t.productVariants.productId, t.products.id))
		.where(where);

	return { data, page: query.page, pageSize: query.pageSize, total: Number(total ?? 0) };
}

export async function adjustStock(input: StockAdjustInput, actorId: string) {
	const movementId = crypto.randomUUID();
	const now = new Date();

	const result = await queryDb.transaction(async (tx: any) => {
		const [variant] = await tx
			.select({
				id: t.productVariants.id,
				sku: t.productVariants.sku,
				name: t.productVariants.name,
				stock: t.productVariants.stock
			})
			.from(t.productVariants)
			.where(eq(t.productVariants.id, input.variantId))
			.limit(1);

		if (!variant) throw new CatalogError(404, 'Variant not found');

		const nextStock = variant.stock + input.delta;
		if (nextStock < 0) {
			throw new CatalogError(409, `Stock cannot go below zero (current: ${variant.stock})`);
		}

		await tx
			.update(t.productVariants)
			.set({ stock: nextStock, updatedAt: now })
			.where(eq(t.productVariants.id, input.variantId));

		await tx.insert(t.inventoryMovements).values({
			id: movementId,
			variantId: input.variantId,
			delta: input.delta,
			reason: input.reason,
			referenceType: input.referenceType ?? null,
			referenceId: input.referenceId ?? null,
			adminUserId: actorId,
			createdAt: now
		});

		return { ...variant, stock: nextStock, movementId };
	});

	return result;
}

export async function listMovements(query: MovementListQuery) {
	const where = query.variantId ? eq(t.inventoryMovements.variantId, query.variantId) : undefined;
	const offset = (query.page - 1) * query.pageSize;

	const data = await queryDb
		.select({
			id: t.inventoryMovements.id,
			variantId: t.inventoryMovements.variantId,
			delta: t.inventoryMovements.delta,
			reason: t.inventoryMovements.reason,
			referenceType: t.inventoryMovements.referenceType,
			referenceId: t.inventoryMovements.referenceId,
			createdAt: t.inventoryMovements.createdAt,
			variantName: t.productVariants.name,
			variantSku: t.productVariants.sku,
			productName: t.products.name
		})
		.from(t.inventoryMovements)
		.innerJoin(t.productVariants, eq(t.inventoryMovements.variantId, t.productVariants.id))
		.innerJoin(t.products, eq(t.productVariants.productId, t.products.id))
		.where(where)
		.orderBy(desc(t.inventoryMovements.createdAt))
		.limit(query.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb
		.select({ value: count() })
		.from(t.inventoryMovements)
		.where(where);

	return { data, page: query.page, pageSize: query.pageSize, total: Number(total ?? 0) };
}

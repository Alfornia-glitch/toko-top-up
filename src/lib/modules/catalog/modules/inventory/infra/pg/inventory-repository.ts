import { and, asc, count, desc, eq, like, lte, or, type SQL } from 'drizzle-orm';
import type { PostgresDb } from '#db/core.ts';
import { inventoryMovements, products, productVariants } from '#db/schema/postgres/catalog.ts';
import type { InventoryRepository } from '../../application/inventory-repository.ts';
import type { InventoryListQuery, MovementListQuery } from '../../domain/inventory.ts';

export function createPostgresInventoryRepository(db: PostgresDb): InventoryRepository {
	return {
		async listVariants(query: InventoryListQuery) {
			const conditions: SQL[] = [];

			if (query.q) {
				const term = `%${query.q}%`;
				const search = or(
					like(productVariants.name, term),
					like(productVariants.sku, term),
					like(products.name, term),
					like(products.sku, term)
				);
				if (search) conditions.push(search);
			}

			if (query.lowStock) conditions.push(lte(productVariants.stock, 5));
			if (query.variantId) conditions.push(eq(productVariants.id, query.variantId));

			const where = conditions.length ? and(...conditions) : undefined;
			const offset = (query.page - 1) * query.pageSize;

			const data = await db
				.select({
					id: productVariants.id,
					sku: productVariants.sku,
					name: productVariants.name,
					stock: productVariants.stock,
					status: productVariants.status,
					priceCents: productVariants.priceCents,
					productId: products.id,
					productName: products.name,
					productSku: products.sku
				})
				.from(productVariants)
				.innerJoin(products, eq(productVariants.productId, products.id))
				.where(where)
				.orderBy(asc(productVariants.stock), asc(productVariants.name))
				.limit(query.pageSize)
				.offset(offset);

			const [totalRow] = await db
				.select({ value: count() })
				.from(productVariants)
				.innerJoin(products, eq(productVariants.productId, products.id))
				.where(where);

			return { data, total: Number(totalRow?.value ?? 0) };
		},

		async listMovements(query: MovementListQuery) {
			const where = query.variantId ? eq(inventoryMovements.variantId, query.variantId) : undefined;
			const offset = (query.page - 1) * query.pageSize;

			const data = await db
				.select({
					id: inventoryMovements.id,
					variantId: inventoryMovements.variantId,
					delta: inventoryMovements.delta,
					reason: inventoryMovements.reason,
					referenceType: inventoryMovements.referenceType,
					referenceId: inventoryMovements.referenceId,
					createdAt: inventoryMovements.createdAt,
					variantName: productVariants.name,
					variantSku: productVariants.sku,
					productName: products.name
				})
				.from(inventoryMovements)
				.innerJoin(productVariants, eq(inventoryMovements.variantId, productVariants.id))
				.innerJoin(products, eq(productVariants.productId, products.id))
				.where(where)
				.orderBy(desc(inventoryMovements.createdAt))
				.limit(query.pageSize)
				.offset(offset);

			const [totalRow] = await db.select({ value: count() }).from(inventoryMovements).where(where);

			return { data, total: Number(totalRow?.value ?? 0) };
		},

		async adjustStock(input, meta) {
			return db.transaction(async (tx) => {
				const [variant] = await tx
					.select({
						id: productVariants.id,
						sku: productVariants.sku,
						name: productVariants.name,
						stock: productVariants.stock
					})
					.from(productVariants)
					.where(eq(productVariants.id, input.variantId))
					.limit(1);

				if (!variant) return { kind: 'not_found' as const };

				const nextStock = variant.stock + input.delta;
				if (nextStock < 0) {
					return { kind: 'negative' as const, currentStock: variant.stock };
				}

				await tx
					.update(productVariants)
					.set({ stock: nextStock, updatedAt: meta.now })
					.where(eq(productVariants.id, input.variantId));

				await tx.insert(inventoryMovements).values({
					id: meta.movementId,
					variantId: input.variantId,
					delta: input.delta,
					reason: input.reason,
					referenceType: input.referenceType ?? null,
					referenceId: input.referenceId ?? null,
					adminUserId: meta.actorId,
					createdAt: meta.now
				});

				return {
					kind: 'adjusted' as const,
					adjustment: {
						id: variant.id,
						sku: variant.sku,
						name: variant.name,
						stock: nextStock,
						movementId: meta.movementId
					}
				};
			});
		}
	};
}

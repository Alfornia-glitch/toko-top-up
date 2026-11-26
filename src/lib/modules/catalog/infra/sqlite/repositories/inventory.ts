import { and, asc, count, desc, eq, gte, like, lte, or, sql, sum, type SQL } from 'drizzle-orm';
import type { SqliteDb } from '#db/core.ts';
import { inventoryMovements, products, productVariants } from '../schema.ts';
import type { InventoryRepository } from '../../../modules/inventory/server.ts';
import type {
	InventoryListQuery,
	MovementListQuery,
	StockReserveOutcome
} from '../../../modules/inventory/index.ts';

export function createSqliteInventoryRepository(db: SqliteDb): InventoryRepository {
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
					price: productVariants.price,
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
			return db.transaction((tx) => {
				const [variant] = tx
					.select({
						id: productVariants.id,
						sku: productVariants.sku,
						name: productVariants.name,
						stock: productVariants.stock
					})
					.from(productVariants)
					.where(eq(productVariants.id, input.variantId))
					.limit(1)
					.all();

				if (!variant) return { kind: 'not_found' as const };

				const nextStock = variant.stock + input.delta;
				if (nextStock < 0) {
					return { kind: 'negative' as const, currentStock: variant.stock };
				}

				tx.update(productVariants)
					.set({ stock: nextStock, updatedAt: meta.now })
					.where(eq(productVariants.id, input.variantId))
					.run();

				tx.insert(inventoryMovements)
					.values({
						id: meta.movementId,
						variantId: input.variantId,
						delta: input.delta,
						reason: input.reason,
						referenceType: input.referenceType ?? null,
						referenceId: input.referenceId ?? null,
						adminUserId: meta.actorId,
						createdAt: meta.now
					})
					.run();

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
		},

		async listAllVariants() {
			return db
				.select({
					id: productVariants.id,
					name: productVariants.name,
					sku: productVariants.sku,
					stock: productVariants.stock,
					price: productVariants.price,
					status: productVariants.status,
					productName: products.name
				})
				.from(productVariants)
				.innerJoin(products, eq(productVariants.productId, products.id));
		},

		async movementTotalsSince(since, limit) {
			const rows = await db
				.select({
					variantId: inventoryMovements.variantId,
					delta: sum(inventoryMovements.delta),
					entries: count()
				})
				.from(inventoryMovements)
				.where(gte(inventoryMovements.createdAt, since))
				.groupBy(inventoryMovements.variantId)
				.orderBy(desc(sum(inventoryMovements.delta)))
				.limit(limit);

			return rows.map((row) => ({
				variantId: row.variantId,
				delta: Number(row.delta ?? 0),
				entries: Number(row.entries ?? 0)
			}));
		},

		async reserveStock(lines, reference, meta) {
			class Rejected extends Error {
				constructor(readonly outcome: Exclude<StockReserveOutcome, { kind: 'reserved' }>) {
					super('stock reservation rejected');
				}
			}

			try {
				return db.transaction((tx) => {
					const stock: Array<{ variantId: string; stock: number; movementId: string }> = [];

					for (const line of lines) {
						const [updated] = tx
							.update(productVariants)
							.set({ stock: sql`${productVariants.stock} - ${line.quantity}`, updatedAt: meta.now })
							.where(
								and(
									eq(productVariants.id, line.variantId),
									gte(productVariants.stock, line.quantity)
								)
							)
							.returning({ stock: productVariants.stock })
							.all();

						if (!updated) {
							const [current] = tx
								.select({ stock: productVariants.stock })
								.from(productVariants)
								.where(eq(productVariants.id, line.variantId))
								.limit(1)
								.all();
							throw new Rejected(
								current
									? { kind: 'insufficient', variantId: line.variantId, available: current.stock }
									: { kind: 'not_found', variantId: line.variantId }
							);
						}

						const movementId = meta.newId();
						tx.insert(inventoryMovements)
							.values({
								id: movementId,
								variantId: line.variantId,
								delta: -line.quantity,
								reason: 'order',
								referenceType: reference.type,
								referenceId: reference.id,
								adminUserId: null,
								createdAt: meta.now
							})
							.run();
						stock.push({ variantId: line.variantId, stock: updated.stock, movementId });
					}

					return { kind: 'reserved' as const, stock };
				});
			} catch (error) {
				if (error instanceof Rejected) return error.outcome;
				throw error;
			}
		},

		async releaseStock(lines, reference, meta) {
			return db.transaction((tx) => {
				const stock: Array<{ variantId: string; stock: number; movementId: string }> = [];

				for (const line of lines) {
					const [updated] = tx
						.update(productVariants)
						.set({ stock: sql`${productVariants.stock} + ${line.quantity}`, updatedAt: meta.now })
						.where(eq(productVariants.id, line.variantId))
						.returning({ stock: productVariants.stock })
						.all();
					if (!updated) continue;

					const movementId = meta.newId();
					tx.insert(inventoryMovements)
						.values({
							id: movementId,
							variantId: line.variantId,
							delta: line.quantity,
							reason: 'order_cancelled',
							referenceType: reference.type,
							referenceId: reference.id,
							adminUserId: null,
							createdAt: meta.now
						})
						.run();
					stock.push({ variantId: line.variantId, stock: updated.stock, movementId });
				}

				return stock;
			});
		}
	};
}

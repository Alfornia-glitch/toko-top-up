import { createPostgresDb, createSqliteDb, type PostgresDb, type SqliteDb } from '#db/core.ts';
import {
	brands as postgresBrands,
	products as postgresProducts
} from '#db/schema/postgres/catalog.ts';
import { brands as sqliteBrands, products as sqliteProducts } from '#db/schema/sqlite/catalog.ts';
import { newId } from '#shared';

export interface BrandTestContext {
	reset(): Promise<void>;
	createProduct(brandId: string): Promise<string>;
}

export function createSqliteBrandTestContext(path: string): {
	db: SqliteDb;
	context: BrandTestContext;
} {
	const { db } = createSqliteDb(path);

	return {
		db,
		context: {
			async reset() {
				await db.delete(sqliteProducts);
				await db.delete(sqliteBrands);
			},
			async createProduct(brandId) {
				const id = newId();
				const now = new Date('2026-01-01T00:00:00.000Z');

				await db.insert(sqliteProducts).values({
					id,
					sku: `SKU-${id}`,
					name: 'Contract product',
					slug: `contract-product-${id}`,
					brandId,
					priceCents: 1000,
					currency: 'USD',
					createdAt: now,
					updatedAt: now
				});

				return id;
			}
		}
	};
}

export function createPostgresBrandTestContext(url: string): {
	db: PostgresDb;
	context: BrandTestContext;
} {
	const { db } = createPostgresDb(url);

	return {
		db,
		context: {
			async reset() {
				await db.delete(postgresProducts);
				await db.delete(postgresBrands);
			},
			async createProduct(brandId) {
				const id = newId();
				const now = new Date('2026-01-01T00:00:00.000Z');

				await db.insert(postgresProducts).values({
					id,
					sku: `SKU-${id}`,
					name: 'Contract product',
					slug: `contract-product-${id}`,
					brandId,
					priceCents: 1000,
					currency: 'USD',
					createdAt: now,
					updatedAt: now
				});

				return id;
			}
		}
	};
}

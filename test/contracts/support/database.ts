import { createPostgresDb, createSqliteDb, type PostgresDb, type SqliteDb } from '#db/core.ts';
import {
	brands as postgresBrands,
	categories as postgresCategories,
	products as postgresProducts
} from '#db/schema/postgres/catalog.ts';
import {
	brands as sqliteBrands,
	categories as sqliteCategories,
	products as sqliteProducts
} from '#db/schema/sqlite/catalog.ts';
import { newId } from '#shared';

export interface CatalogTestContext {
	reset(): Promise<void>;
	createProduct(brandId: string): Promise<string>;
	createCategoryProduct(
		categoryId: string,
		status?: 'draft' | 'active' | 'archived'
	): Promise<string>;
}

export function createSqliteBrandTestContext(path: string): {
	db: SqliteDb;
	context: CatalogTestContext;
} {
	const { db } = createSqliteDb(path);

	return {
		db,
		context: {
			async reset() {
				await db.delete(sqliteProducts);
				await db.delete(sqliteCategories);
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
			},
			async createCategoryProduct(categoryId, status = 'draft') {
				const id = newId();
				const now = new Date('2026-01-01T00:00:00.000Z');

				await db.insert(sqliteProducts).values({
					id,
					sku: `SKU-${id}`,
					name: 'Contract product',
					slug: `contract-product-${id}`,
					categoryId,
					status,
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
	context: CatalogTestContext;
} {
	const { db } = createPostgresDb(url);

	return {
		db,
		context: {
			async reset() {
				await db.delete(postgresProducts);
				await db.delete(postgresCategories);
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
			},
			async createCategoryProduct(categoryId, status = 'draft') {
				const id = newId();
				const now = new Date('2026-01-01T00:00:00.000Z');

				await db.insert(postgresProducts).values({
					id,
					sku: `SKU-${id}`,
					name: 'Contract product',
					slug: `contract-product-${id}`,
					categoryId,
					status,
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

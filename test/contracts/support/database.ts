import { createPostgresDb, createSqliteDb, type PostgresDb, type SqliteDb } from '#db/core.ts';
import {
	brands as postgresBrands,
	categories as postgresCategories,
	inventoryMovements as postgresInventoryMovements,
	productImages as postgresProductImages,
	productOptions as postgresProductOptions,
	productOptionValues as postgresProductOptionValues,
	productVariants as postgresProductVariants,
	products as postgresProducts
} from '#modules/catalog/infra/pg/schema.ts';
import {
	brands as sqliteBrands,
	categories as sqliteCategories,
	inventoryMovements as sqliteInventoryMovements,
	productImages as sqliteProductImages,
	productOptions as sqliteProductOptions,
	productOptionValues as sqliteProductOptionValues,
	productVariants as sqliteProductVariants,
	products as sqliteProducts
} from '#modules/catalog/infra/sqlite/schema.ts';
import { user as postgresUser } from '#db/schema/postgres/auth.ts';
import { user as sqliteUser } from '#db/schema/sqlite/auth.ts';
import { newId } from '#shared';

const FIXTURE_DATE = new Date('2026-01-01T00:00:00.000Z');
const ACTOR_ID = 'contract-actor';

type ProductStatus = 'draft' | 'active' | 'archived';
type VariantStatus = 'active' | 'inactive';

export interface ProductFixtureOptions {
	brandId?: string | null;
	categoryId?: string | null;
	status?: ProductStatus;
	sku?: string;
	name?: string;
	slug?: string;
	priceCents?: number;
}

export interface VariantFixtureOptions {
	sku?: string;
	name?: string;
	stock?: number;
	status?: VariantStatus;
	priceCents?: number;
}

export interface ProductVariantFixtureOptions {
	product?: ProductFixtureOptions;
	variant?: VariantFixtureOptions;
}

export interface ProductVariantFixture {
	productId: string;
	variantId: string;
}

export interface CatalogTestContext {
	reset(): Promise<void>;
	createActor(): Promise<string>;
	createBrand(name?: string): Promise<string>;
	createCategory(name?: string): Promise<string>;
	createProduct(brandId: string): Promise<string>;
	createCategoryProduct(categoryId: string, status?: ProductStatus): Promise<string>;
	createProductWithVariant(options?: ProductVariantFixtureOptions): Promise<ProductVariantFixture>;
	createVariant(productId: string, options?: VariantFixtureOptions): Promise<string>;
}

export function createSqliteCatalogTestContext(path: string): {
	db: SqliteDb;
	context: CatalogTestContext;
} {
	const { db } = createSqliteDb(path);

	async function insertProduct(options: ProductFixtureOptions = {}): Promise<string> {
		const id = newId();

		await db.insert(sqliteProducts).values({
			id,
			sku: options.sku ?? `SKU-${id}`,
			name: options.name ?? 'Contract product',
			slug: options.slug ?? `contract-product-${id}`,
			brandId: options.brandId ?? null,
			categoryId: options.categoryId ?? null,
			status: options.status ?? 'draft',
			priceCents: options.priceCents ?? 1000,
			currency: 'USD',
			createdAt: FIXTURE_DATE,
			updatedAt: FIXTURE_DATE
		});

		return id;
	}

	async function insertVariant(
		productId: string,
		options: VariantFixtureOptions = {}
	): Promise<string> {
		const id = newId();

		await db.insert(sqliteProductVariants).values({
			id,
			productId,
			sku: options.sku ?? `VAR-${id}`,
			name: options.name ?? 'Contract variant',
			priceCents: options.priceCents ?? 1000,
			stock: options.stock ?? 0,
			status: options.status ?? 'active',
			createdAt: FIXTURE_DATE,
			updatedAt: FIXTURE_DATE
		});

		return id;
	}

	return {
		db,
		context: {
			async reset() {
				await db.delete(sqliteInventoryMovements);
				await db.delete(sqliteProductVariants);
				await db.delete(sqliteProductOptionValues);
				await db.delete(sqliteProductOptions);
				await db.delete(sqliteProductImages);
				await db.delete(sqliteProducts);
				await db.delete(sqliteCategories);
				await db.delete(sqliteBrands);
			},
			async createActor() {
				await db
					.insert(sqliteUser)
					.values({
						id: ACTOR_ID,
						name: 'Contract Actor',
						email: 'contract-actor@example.com',
						role: 'admin',
						createdAt: FIXTURE_DATE,
						updatedAt: FIXTURE_DATE
					})
					.onConflictDoNothing();
				return ACTOR_ID;
			},
			async createBrand(name = 'Contract brand') {
				const id = newId();
				await db.insert(sqliteBrands).values({
					id,
					name,
					slug: `contract-brand-${id}`,
					status: 'active',
					createdAt: FIXTURE_DATE,
					updatedAt: FIXTURE_DATE
				});
				return id;
			},
			async createCategory(name = 'Contract category') {
				const id = newId();
				await db.insert(sqliteCategories).values({
					id,
					name,
					slug: `contract-category-${id}`,
					status: 'active',
					position: 0,
					createdAt: FIXTURE_DATE,
					updatedAt: FIXTURE_DATE
				});
				return id;
			},
			async createProduct(brandId) {
				return insertProduct({ brandId });
			},
			async createCategoryProduct(categoryId, status = 'draft') {
				return insertProduct({ categoryId, status });
			},
			async createProductWithVariant(options = {}) {
				const productId = await insertProduct(options.product);
				const variantId = await insertVariant(productId, options.variant);
				return { productId, variantId };
			},
			async createVariant(productId, options = {}) {
				return insertVariant(productId, options);
			}
		}
	};
}

export function createPostgresCatalogTestContext(url: string): {
	db: PostgresDb;
	context: CatalogTestContext;
} {
	const { db } = createPostgresDb(url);

	async function insertProduct(options: ProductFixtureOptions = {}): Promise<string> {
		const id = newId();

		await db.insert(postgresProducts).values({
			id,
			sku: options.sku ?? `SKU-${id}`,
			name: options.name ?? 'Contract product',
			slug: options.slug ?? `contract-product-${id}`,
			brandId: options.brandId ?? null,
			categoryId: options.categoryId ?? null,
			status: options.status ?? 'draft',
			priceCents: options.priceCents ?? 1000,
			currency: 'USD',
			createdAt: FIXTURE_DATE,
			updatedAt: FIXTURE_DATE
		});

		return id;
	}

	async function insertVariant(
		productId: string,
		options: VariantFixtureOptions = {}
	): Promise<string> {
		const id = newId();

		await db.insert(postgresProductVariants).values({
			id,
			productId,
			sku: options.sku ?? `VAR-${id}`,
			name: options.name ?? 'Contract variant',
			priceCents: options.priceCents ?? 1000,
			stock: options.stock ?? 0,
			status: options.status ?? 'active',
			createdAt: FIXTURE_DATE,
			updatedAt: FIXTURE_DATE
		});

		return id;
	}

	return {
		db,
		context: {
			async reset() {
				await db.delete(postgresInventoryMovements);
				await db.delete(postgresProductVariants);
				await db.delete(postgresProductOptionValues);
				await db.delete(postgresProductOptions);
				await db.delete(postgresProductImages);
				await db.delete(postgresProducts);
				await db.delete(postgresCategories);
				await db.delete(postgresBrands);
			},
			async createActor() {
				await db
					.insert(postgresUser)
					.values({
						id: ACTOR_ID,
						name: 'Contract Actor',
						email: 'contract-actor@example.com',
						role: 'admin',
						createdAt: FIXTURE_DATE,
						updatedAt: FIXTURE_DATE
					})
					.onConflictDoNothing();
				return ACTOR_ID;
			},
			async createBrand(name = 'Contract brand') {
				const id = newId();
				await db.insert(postgresBrands).values({
					id,
					name,
					slug: `contract-brand-${id}`,
					status: 'active',
					createdAt: FIXTURE_DATE,
					updatedAt: FIXTURE_DATE
				});
				return id;
			},
			async createCategory(name = 'Contract category') {
				const id = newId();
				await db.insert(postgresCategories).values({
					id,
					name,
					slug: `contract-category-${id}`,
					status: 'active',
					position: 0,
					createdAt: FIXTURE_DATE,
					updatedAt: FIXTURE_DATE
				});
				return id;
			},
			async createProduct(brandId) {
				return insertProduct({ brandId });
			},
			async createCategoryProduct(categoryId, status = 'draft') {
				return insertProduct({ categoryId, status });
			},
			async createProductWithVariant(options = {}) {
				const productId = await insertProduct(options.product);
				const variantId = await insertVariant(productId, options.variant);
				return { productId, variantId };
			},
			async createVariant(productId, options = {}) {
				return insertVariant(productId, options);
			}
		}
	};
}

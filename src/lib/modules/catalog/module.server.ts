import type { Clock, EventBus } from '#shared';
import { systemClock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { createPostgresBrowseRepository } from './infra/pg/repositories/browse.ts';
import { createPostgresBrandRepository } from './infra/pg/repositories/brands.ts';
import { createPostgresCategoryRepository } from './infra/pg/repositories/categories.ts';
import { createPostgresInventoryRepository } from './infra/pg/repositories/inventory.ts';
import { createPostgresProductRepository } from './infra/pg/repositories/products.ts';
import { createSqliteBrowseRepository } from './infra/sqlite/repositories/browse.ts';
import { createSqliteBrandRepository } from './infra/sqlite/repositories/brands.ts';
import { createSqliteCategoryRepository } from './infra/sqlite/repositories/categories.ts';
import { createSqliteInventoryRepository } from './infra/sqlite/repositories/inventory.ts';
import { createSqliteProductRepository } from './infra/sqlite/repositories/products.ts';
import { createBrowseService, type BrowseService } from './modules/browse/server.ts';
import { createBrandService, type BrandService } from './modules/brands/server.ts';
import { createCategoryService, type CategoryService } from './modules/categories/server.ts';
import { createInventoryService, type InventoryService } from './modules/inventory/server.ts';
import { createProductService, type ProductService } from './modules/products/server.ts';

export interface CatalogServices {
	readonly products: ProductService;
	readonly brands: BrandService;
	readonly categories: CategoryService;
	readonly inventory: InventoryService;
	/** Public, actor-free browsing of active products for the storefront. */
	readonly browse: BrowseService;
}

type CatalogServiceOptions =
	| { provider: 'postgres'; db: PostgresDb; clock?: Clock; events?: EventBus }
	| { provider: 'sqlite'; db: SqliteDb; clock?: Clock; events?: EventBus };

export function createCatalogServices(options: CatalogServiceOptions): CatalogServices {
	const clock = options.clock ?? systemClock;

	if (options.provider === 'postgres') {
		return {
			products: createProductService(
				createPostgresProductRepository(options.db),
				clock,
				options.events
			),
			brands: createBrandService(createPostgresBrandRepository(options.db), clock),
			categories: createCategoryService(createPostgresCategoryRepository(options.db), clock),
			inventory: createInventoryService(
				createPostgresInventoryRepository(options.db),
				clock,
				options.events
			),
			browse: createBrowseService(createPostgresBrowseRepository(options.db))
		};
	}

	return {
		products: createProductService(
			createSqliteProductRepository(options.db),
			clock,
			options.events
		),
		brands: createBrandService(createSqliteBrandRepository(options.db), clock),
		categories: createCategoryService(createSqliteCategoryRepository(options.db), clock),
		inventory: createInventoryService(
			createSqliteInventoryRepository(options.db),
			clock,
			options.events
		),
		browse: createBrowseService(createSqliteBrowseRepository(options.db))
	};
}

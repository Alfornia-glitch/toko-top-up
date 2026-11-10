import type { Clock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { createBrandService, type BrandService } from './modules/brands/server.ts';
import { createCategoryService, type CategoryService } from './modules/categories/server.ts';
import { createInventoryService, type InventoryService } from './modules/inventory/server.ts';
import { createProductService, type ProductService } from './modules/products/server.ts';

export interface CatalogServices {
	readonly products: ProductService;
	readonly brands: BrandService;
	readonly categories: CategoryService;
	readonly inventory: InventoryService;
}

type CatalogServiceOptions =
	| { provider: 'postgres'; db: PostgresDb; clock?: Clock }
	| { provider: 'sqlite'; db: SqliteDb; clock?: Clock };

export function createCatalogServices(options: CatalogServiceOptions): CatalogServices {
	return {
		products: createProductService(options),
		brands: createBrandService(options),
		categories: createCategoryService(options),
		inventory: createInventoryService(options)
	};
}

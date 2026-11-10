import { createEventBus, systemClock, type Clock, type EventBus } from '#shared';
import {
	createPostgresDb,
	createSqliteDb,
	type Db,
	type PostgresDb,
	type SqliteDb
} from '#db/core.ts';
import { createBrandService, type BrandService } from '#modules/catalog/server.ts';
import { createCategoryService, type CategoryService } from '#modules/catalog/server.ts';
import { createInventoryService, type InventoryService } from '#modules/catalog/server.ts';
import { createProductService, type ProductService } from '#modules/catalog/server.ts';
import { loadConfig, type AppConfig } from './config.server.ts';
import { createModuleRegistry } from './registry.server.ts';

export interface CatalogServices {
	readonly products: ProductService;
	readonly brands: BrandService;
	readonly categories: CategoryService;
	readonly inventory: InventoryService;
}

export interface RuntimeServices {
	readonly catalog: CatalogServices;
}

export interface Runtime {
	readonly config: AppConfig;
	readonly db: Db;
	readonly eventBus: EventBus;
	readonly services: RuntimeServices;
}

export interface RuntimeOptions {
	readonly clock?: Clock;
	readonly eventBus?: EventBus;
}

export function createRuntime(
	config: AppConfig = loadConfig(),
	options: RuntimeOptions = {}
): Runtime {
	const clock = options.clock ?? systemClock;
	const eventBus = options.eventBus ?? createEventBus();
	const db: Db =
		config.database.provider === 'postgres'
			? createPostgresDb(config.database.url).db
			: createSqliteDb(config.database.path).db;

	const serviceOptions = () =>
		config.database.provider === 'postgres'
			? { provider: 'postgres' as const, db: db as PostgresDb, clock }
			: { provider: 'sqlite' as const, db: db as SqliteDb, clock };

	let products: ProductService | undefined;
	let brands: BrandService | undefined;
	let categories: CategoryService | undefined;
	let inventory: InventoryService | undefined;
	let catalog: CatalogServices | undefined;

	const registry = createModuleRegistry();

	registry.register({
		name: 'catalog.products',
		initialize() {
			products = createProductService(serviceOptions());
		}
	});
	registry.register({
		name: 'catalog.brands',
		initialize() {
			brands = createBrandService(serviceOptions());
		}
	});
	registry.register({
		name: 'catalog.categories',
		initialize() {
			categories = createCategoryService(serviceOptions());
		}
	});
	registry.register({
		name: 'catalog.inventory',
		initialize() {
			inventory = createInventoryService(serviceOptions());
		}
	});
	registry.register({
		name: 'catalog',
		dependencies: ['catalog.products', 'catalog.brands', 'catalog.categories', 'catalog.inventory'],
		initialize() {
			if (!products || !brands || !categories || !inventory) {
				throw new Error('Catalog services failed to initialize');
			}

			catalog = { products, brands, categories, inventory };
		}
	});

	registry.initialize();

	if (!catalog) throw new Error('Catalog module failed to initialize');

	return {
		config,
		db,
		eventBus,
		services: { catalog }
	};
}

let runtime: Runtime | undefined;

export function getRuntime(): Runtime {
	runtime ??= createRuntime();
	return runtime;
}

export function resetRuntime(): void {
	runtime = undefined;
}

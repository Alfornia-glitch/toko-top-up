import { createEventBus, systemClock, type Clock, type EventBus } from '#shared';
import { db as sharedDb, dbProvider } from '#db/index.ts';
import type { Db, PostgresDb, SqliteDb } from '#db/core.ts';
import { createCatalogServices, type CatalogServices } from '#modules/catalog/server.ts';
import { createContentServices, type ContentServices } from '#modules/content/server.ts';
import { createReportingServices, type ReportingServices } from '#modules/reporting/server.ts';
import { loadConfig, type AppConfig } from './config.server.ts';
import { createModuleRegistry } from './registry.server.ts';

export interface RuntimeServices {
	readonly catalog: CatalogServices;
	readonly reporting: ReportingServices;
	readonly content: ContentServices;
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

	if (config.database.provider !== dbProvider) {
		throw new Error(
			`Database provider mismatch: config=${config.database.provider}, driver=${dbProvider}`
		);
	}

	const db: Db = sharedDb;

	const serviceOptions = () =>
		dbProvider === 'postgres'
			? { provider: 'postgres' as const, db: db as PostgresDb, clock, events: eventBus }
			: { provider: 'sqlite' as const, db: db as SqliteDb, clock, events: eventBus };

	let catalog: CatalogServices | undefined;
	let reporting: ReportingServices | undefined;
	let content: ContentServices | undefined;
	const registry = createModuleRegistry();

	registry.register({
		name: 'catalog',
		initialize() {
			catalog = createCatalogServices(serviceOptions());
		}
	});
	registry.register({
		name: 'reporting',
		dependencies: ['catalog'],
		initialize() {
			if (!catalog) throw new Error('Catalog services are required by reporting');
			reporting = createReportingServices({
				...serviceOptions(),
				catalog,
				eventBus,
				clock
			});
		}
	});

	registry.register({
		name: 'content',
		initialize() {
			content = createContentServices(serviceOptions());
		}
	});

	registry.initialize();

	if (!catalog || !reporting || !content) throw new Error('Modules failed to initialize');

	return {
		config,
		db,
		eventBus,
		services: { catalog, reporting, content }
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

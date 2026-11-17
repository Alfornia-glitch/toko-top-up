import { createEventBus, systemClock, type Clock, type EventBus } from '#shared';
import { db as sharedDb, dbProvider } from '#db/index.ts';
import type { Db, PostgresDb, SqliteDb } from '#db/core.ts';
import { createCatalogServices, type CatalogServices } from '#modules/catalog/server.ts';
import { createContentServices, type ContentServices } from '#modules/content/server.ts';
import { createCheckoutServices, type CheckoutServices } from '#modules/checkout/server.ts';
import { createAuditServices, type AuditServices } from '#modules/audit/server.ts';
import { createCartServices, type CartServices } from '#modules/cart/server.ts';
import { createCustomersServices, type CustomersServices } from '#modules/customers/server.ts';
import { createMarketingServices, type MarketingServices } from '#modules/marketing/server.ts';
import { createStorefrontServices, type StorefrontServices } from '#modules/storefront/server.ts';
import { createSupportServices, type SupportServices } from '#modules/support/server.ts';
import { createOrdersServices, type OrdersServices } from '#modules/orders/server.ts';
import {
	createLocalProofStorage,
	createPaymentsServices,
	type PaymentsServices
} from '#modules/payments/server.ts';
import { createReportingServices, type ReportingServices } from '#modules/reporting/server.ts';
import { createCheckoutSettings } from './adapters/checkout-settings.ts';
import { createCustomerDirectory } from './adapters/customer-directory.ts';
import { createReviewDirectory } from './adapters/review-directory.ts';
import { createOrdersUserDirectory } from './adapters/orders-users.ts';
import { createPaymentsHooks } from './adapters/payments-hooks.ts';
import { loadPaymentsConfig } from './payments-config.server.ts';
import { createSupportUserDirectory } from './adapters/support-users.ts';
import { loadConfig, type AppConfig } from './config.server.ts';
import { createModuleRegistry } from './registry.server.ts';

export interface RuntimeServices {
	readonly catalog: CatalogServices;
	readonly reporting: ReportingServices;
	readonly content: ContentServices;
	readonly customers: CustomersServices;
	readonly support: SupportServices;
	readonly marketing: MarketingServices;
	readonly cart: CartServices;
	readonly orders: OrdersServices;
	readonly checkout: CheckoutServices;
	readonly payments: PaymentsServices;
	readonly storefront: StorefrontServices;
	readonly audit: AuditServices;
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
	let customers: CustomersServices | undefined;
	let support: SupportServices | undefined;
	let marketing: MarketingServices | undefined;
	let cart: CartServices | undefined;
	let orders: OrdersServices | undefined;
	let checkout: CheckoutServices | undefined;
	let payments: PaymentsServices | undefined;
	let storefront: StorefrontServices | undefined;
	let audit: AuditServices | undefined;
	const registry = createModuleRegistry();

	registry.register({
		name: 'catalog',
		initialize() {
			catalog = createCatalogServices(serviceOptions());
		}
	});
	registry.register({
		name: 'reporting',
		dependencies: ['catalog', 'orders', 'customers'],
		initialize() {
			if (!catalog || !orders || !customers) {
				throw new Error('Catalog, orders and customers services are required by reporting');
			}
			reporting = createReportingServices({
				...serviceOptions(),
				catalog,
				orders,
				customers,
				eventBus,
				clock
			});
		}
	});

	registry.register({
		name: 'content',
		dependencies: ['catalog'],
		initialize() {
			if (!catalog) throw new Error('Catalog services are required by content');
			content = createContentServices({
				...serviceOptions(),
				directory: createReviewDirectory(catalog)
			});
		}
	});

	registry.register({
		name: 'customers',
		initialize() {
			customers = createCustomersServices({
				...serviceOptions(),
				directory: createCustomerDirectory(() => {
					if (!orders) throw new Error('Orders services are not ready');
					return orders.orders;
				})
			});
		}
	});

	registry.register({
		name: 'support',
		initialize() {
			support = createSupportServices({
				...serviceOptions(),
				users: createSupportUserDirectory()
			});
		}
	});

	registry.register({
		name: 'marketing',
		initialize() {
			marketing = createMarketingServices(serviceOptions());
		}
	});

	registry.register({
		name: 'cart',
		dependencies: ['catalog', 'marketing'],
		initialize() {
			if (!catalog || !marketing) throw new Error('Catalog and marketing are required by cart');
			cart = createCartServices({ ...serviceOptions(), catalog, marketing });
		}
	});

	registry.register({
		name: 'orders',
		initialize() {
			orders = createOrdersServices({ ...serviceOptions(), users: createOrdersUserDirectory() });
		}
	});

	registry.register({
		name: 'storefront',
		dependencies: ['catalog', 'content', 'customers'],
		initialize() {
			if (!catalog || !content || !customers) {
				throw new Error('Catalog, content and customers are required by storefront');
			}
			storefront = createStorefrontServices({
				catalog,
				content,
				customers
			});
		}
	});

	registry.register({
		name: 'checkout',
		dependencies: ['cart', 'catalog', 'customers', 'marketing', 'orders', 'storefront'],
		initialize() {
			if (!cart || !catalog || !customers || !marketing || !orders || !storefront) {
				throw new Error('Cart, catalog, customers, marketing and orders are required by checkout');
			}
			checkout = createCheckoutServices({
				cart,
				catalog,
				customers,
				marketing,
				orders,
				settings: createCheckoutSettings(storefront.storefront)
			});
		}
	});

	registry.register({
		name: 'payments',
		dependencies: ['orders', 'catalog'],
		initialize() {
			if (!orders || !catalog) throw new Error('Orders and catalog are required by payments');
			const { proofDirectory, ...paymentsConfig } = loadPaymentsConfig();
			payments = createPaymentsServices({
				...serviceOptions(),
				orders,
				storage: createLocalProofStorage(proofDirectory),
				config: paymentsConfig,
				hooks: createPaymentsHooks(orders, catalog)
			});
		}
	});

	registry.register({
		name: 'audit',
		initialize() {
			audit = createAuditServices(serviceOptions());
		}
	});

	registry.initialize();

	if (
		!catalog ||
		!reporting ||
		!content ||
		!customers ||
		!support ||
		!marketing ||
		!cart ||
		!orders ||
		!checkout ||
		!payments ||
		!storefront ||
		!audit
	)
		throw new Error('Modules failed to initialize');

	return {
		config,
		db,
		eventBus,
		services: {
			catalog,
			reporting,
			content,
			customers,
			support,
			marketing,
			cart,
			orders,
			checkout,
			payments,
			storefront,
			audit
		}
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

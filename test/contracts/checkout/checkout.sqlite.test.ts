// @vitest-environment node
import { createSqliteDb } from '#db/sqlite.ts';
import { createCartServices } from '#modules/cart/server.ts';
import { cartItems, carts } from '#modules/cart/infra/sqlite/schema.ts';
import { createCatalogServices } from '#modules/catalog/server.ts';
import { createCheckoutServices, type AccountFormField } from '#modules/checkout/server.ts';
import { createCustomersServices } from '#modules/customers/server.ts';
import { addresses } from '#modules/customers/infra/sqlite/schema.ts';
import { createMarketingServices, type MarketingService } from '#modules/marketing/server.ts';
import { couponRedemptions, coupons } from '#modules/marketing/infra/sqlite/schema.ts';
import { createOrdersServices, type OrdersService } from '#modules/orders/server.ts';
import {
	orderEvents,
	orderItems,
	orders as orders_table,
	payments,
	returnRequestImages,
	returnRequests,
	shipments
} from '#modules/orders/infra/sqlite/schema.ts';
import { runCheckoutContract } from './checkout.contract.ts';
import { createFakeCheckoutSettings } from './settings.ts';
import { createFakeOrdersUsers } from '../orders/users.ts';
import { createTestClock } from '../support/clock.ts';
import { createSqliteCatalogTestContext } from '../support/database.ts';

const sqlitePath = process.env.TEST_SQLITE_PATH;

if (!sqlitePath) {
	throw new Error('TEST_SQLITE_PATH is missing; run tests through pnpm run test');
}

const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
const { db } = createSqliteDb(sqlitePath);
const { context } = createSqliteCatalogTestContext(sqlitePath);

const catalog = createCatalogServices({ provider: 'sqlite', db, clock });
const marketing = createMarketingServices({ provider: 'sqlite', db, clock });
const cart = createCartServices({ provider: 'sqlite', db, clock, catalog, marketing });
const customers = createCustomersServices({
	provider: 'sqlite',
	db,
	clock,
	directory: { list: async () => ({ data: [], total: 0 }), findProfile: async () => null }
});
const orders = createOrdersServices({
	provider: 'sqlite',
	db,
	clock,
	users: createFakeOrdersUsers()
});

runCheckoutContract({
	createCheckout: (
		overrides: {
			orders?: Partial<OrdersService>;
			marketing?: Partial<MarketingService>;
			accountForm?: AccountFormField[] | null;
		} = {}
	) =>
		createCheckoutServices({
			cart,
			catalog,
			customers,
			marketing: { marketing: { ...marketing.marketing, ...overrides.marketing } },
			orders: { orders: { ...orders.orders, ...overrides.orders } },
			settings: createFakeCheckoutSettings(overrides.accountForm ?? null)
		}).checkout,
	cart: cart.cart,
	catalog,
	customers: customers.customers,
	marketing: marketing.marketing,
	orders: orders.orders,
	clock,
	async reset() {
		for (const table of [
			returnRequestImages,
			returnRequests,
			orderEvents,
			payments,
			shipments,
			orderItems,
			orders_table,
			cartItems,
			carts,
			couponRedemptions,
			coupons,
			addresses
		]) {
			await db.delete(table);
		}
		await context.reset();
	},
	createProductWithVariant: context.createProductWithVariant
});

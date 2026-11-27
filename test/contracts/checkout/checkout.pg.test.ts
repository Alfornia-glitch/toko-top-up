// @vitest-environment node
import { describe, test } from 'vitest';
import { createPostgresDb } from '#db/core.ts';
import { createCartServices } from '#modules/cart/server.ts';
import { cartItems, carts } from '#modules/cart/infra/pg/schema.ts';
import { createCatalogServices } from '#modules/catalog/server.ts';
import { createCheckoutServices, type AccountFormField } from '#modules/checkout/server.ts';
import { createCustomersServices } from '#modules/customers/server.ts';
import { addresses } from '#modules/customers/infra/pg/schema.ts';
import { createMarketingServices, type MarketingService } from '#modules/marketing/server.ts';
import { couponRedemptions, coupons } from '#modules/marketing/infra/pg/schema.ts';
import { createOrdersServices, type OrdersService } from '#modules/orders/server.ts';
import {
	orderEvents,
	orderItems,
	orders as ordersTable,
	payments,
	returnRequestImages,
	returnRequests,
	shipments
} from '#modules/orders/infra/pg/schema.ts';
import { runCheckoutContract } from './checkout.contract.ts';
import { createFakeCheckoutSettings } from './settings.ts';
import { createFakeOrdersUsers } from '../orders/users.ts';
import { createTestClock } from '../support/clock.ts';
import { createPostgresCatalogTestContext } from '../support/database.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('checkout contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db } = createPostgresDb(testDatabaseUrl);
		const { context } = createPostgresCatalogTestContext(testDatabaseUrl);

		const catalog = createCatalogServices({ provider: 'postgres', db, clock });
		const marketing = createMarketingServices({ provider: 'postgres', db, clock });
		const cart = createCartServices({ provider: 'postgres', db, clock, catalog, marketing });
		const customers = createCustomersServices({
			provider: 'postgres',
			db,
			clock,
			directory: { list: async () => ({ data: [], total: 0 }), findProfile: async () => null }
		});
		const orders = createOrdersServices({
			provider: 'postgres',
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
					ordersTable,
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
	});
} else {
	describe.skip('checkout contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

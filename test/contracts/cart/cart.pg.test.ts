// @vitest-environment node
import { describe, test } from 'vitest';
import { createPostgresDb } from '#db/core.ts';
import { createCatalogServices } from '#modules/catalog/server.ts';
import { createCartServices } from '#modules/cart/server.ts';
import { cartItems, carts } from '#modules/cart/infra/pg/schema.ts';
import { createMarketingServices } from '#modules/marketing/server.ts';
import { couponRedemptions, coupons } from '#modules/marketing/infra/pg/schema.ts';
import { runCartContract } from './cart.contract.ts';
import { createTestClock } from '../support/clock.ts';
import { createPostgresCatalogTestContext } from '../support/database.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('cart contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db } = createPostgresDb(testDatabaseUrl);
		const { context } = createPostgresCatalogTestContext(testDatabaseUrl);
		const catalog = createCatalogServices({ provider: 'postgres', db, clock });
		const marketing = createMarketingServices({ provider: 'postgres', db, clock });

		runCartContract({
			service: createCartServices({ provider: 'postgres', db, clock, catalog, marketing }).cart,
			marketing: marketing.marketing,
			clock,
			async reset() {
				await db.delete(cartItems);
				await db.delete(carts);
				await db.delete(couponRedemptions);
				await db.delete(coupons);
				await context.reset();
			},
			createProductWithVariant: context.createProductWithVariant
		});
	});
} else {
	describe.skip('cart contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

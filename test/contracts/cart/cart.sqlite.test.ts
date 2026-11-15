// @vitest-environment node
import { createSqliteDb } from '#db/sqlite.ts';
import { createCatalogServices } from '#modules/catalog/server.ts';
import { createCartServices } from '#modules/cart/server.ts';
import { cartItems, carts } from '#modules/cart/infra/sqlite/schema.ts';
import { createMarketingServices } from '#modules/marketing/server.ts';
import { couponRedemptions, coupons } from '#modules/marketing/infra/sqlite/schema.ts';
import { runCartContract } from './cart.contract.ts';
import { createTestClock } from '../support/clock.ts';
import { createSqliteCatalogTestContext } from '../support/database.ts';

const sqlitePath = process.env.TEST_SQLITE_PATH;

if (!sqlitePath) {
	throw new Error('TEST_SQLITE_PATH is missing; run tests through bun run test');
}

const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
const { db } = createSqliteDb(sqlitePath);
const { context } = createSqliteCatalogTestContext(sqlitePath);
const catalog = createCatalogServices({ provider: 'sqlite', db, clock });
const marketing = createMarketingServices({ provider: 'sqlite', db, clock });

runCartContract({
	service: createCartServices({ provider: 'sqlite', db, clock, catalog, marketing }).cart,
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

// @vitest-environment node
import { createSqliteDb } from '#db/sqlite.ts';
import { createCatalogServices } from '#modules/catalog/server.ts';
import { createContentServices } from '#modules/content/server.ts';
import {
	announcements,
	banners,
	mediaAssets,
	siteSettings,
	reviewImages,
	reviews,
	testimonials
} from '#modules/content/infra/sqlite/schema.ts';
import { createCustomersServices } from '#modules/customers/server.ts';
import { wishlists } from '#modules/customers/infra/sqlite/schema.ts';
import { createStorefrontServices } from '#modules/storefront/server.ts';
import { runStorefrontContract } from './storefront.contract.ts';
import { createFakeReviewDirectory } from '../content/directory.ts';
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
const directory = createFakeReviewDirectory();
const content = createContentServices({
	provider: 'sqlite',
	db,
	clock,
	directory
});
const customers = createCustomersServices({
	provider: 'sqlite',
	db,
	clock,
	directory: { list: async () => ({ data: [], total: 0 }), findProfile: async () => null }
});

runStorefrontContract({
	storefront: createStorefrontServices({
		catalog,
		content,
		customers
	}).storefront,
	catalog,
	content: content.content,
	customers: customers.customers,
	clock,
	async reset() {
		for (const table of [
			banners,
			announcements,
			testimonials,
			mediaAssets,
			siteSettings,
			wishlists
		]) {
			await db.delete(table);
		}
		await context.reset();
	},
	async seedReview(review) {
		await db.insert(reviews).values({ body: null, createdAt: clock.now(), ...review });
	},
	createActor: context.createActor,
	createBrand: context.createBrand,
	createCategory: context.createCategory
});

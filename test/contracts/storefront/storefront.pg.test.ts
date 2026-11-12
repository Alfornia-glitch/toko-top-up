// @vitest-environment node
import { describe, test } from 'vitest';
import { createPostgresDb } from '#db/core.ts';
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
} from '#modules/content/infra/pg/schema.ts';
import { createCustomersServices } from '#modules/customers/server.ts';
import { wishlists } from '#modules/customers/infra/pg/schema.ts';
import { createStorefrontServices } from '#modules/storefront/server.ts';
import { runStorefrontContract } from './storefront.contract.ts';
import { createFakeReviewDirectory } from '../content/directory.ts';
import { createTestClock } from '../support/clock.ts';
import { createPostgresCatalogTestContext } from '../support/database.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('storefront contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db } = createPostgresDb(testDatabaseUrl);
		const { context } = createPostgresCatalogTestContext(testDatabaseUrl);

		const catalog = createCatalogServices({ provider: 'postgres', db, clock });
		const directory = createFakeReviewDirectory();
		const content = createContentServices({
			provider: 'postgres',
			db,
			clock,
			directory
		});
		const customers = createCustomersServices({
			provider: 'postgres',
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
	});
} else {
	describe.skip('storefront contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

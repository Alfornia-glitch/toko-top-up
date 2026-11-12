// @vitest-environment node
import { describe, test } from 'vitest';
import { createCatalogServices } from '#modules/catalog/server.ts';
import { runCategoryContract } from './categories.contract.ts';
import { createTestClock } from '../support/clock.ts';
import { createPostgresCatalogTestContext } from '../support/database.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('categories contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db, context } = createPostgresCatalogTestContext(testDatabaseUrl);

		runCategoryContract({
			service: createCatalogServices({ provider: 'postgres', db, clock }).categories,
			clock,
			reset: context.reset,
			createCategoryProduct: context.createCategoryProduct
		});
	});
} else {
	describe.skip('categories contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

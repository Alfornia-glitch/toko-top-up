// @vitest-environment node
import { describe, test } from 'vitest';
import { createBrandService } from '#modules/catalog/server.ts';
import { runBrandContract } from './brands.contract.ts';
import { createTestClock } from '../support/clock.ts';
import { createPostgresCatalogTestContext } from '../support/database.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('brands contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db, context } = createPostgresCatalogTestContext(testDatabaseUrl);

		runBrandContract({
			service: createBrandService({ provider: 'postgres', db, clock }),
			clock,
			reset: context.reset,
			createProduct: context.createProduct
		});
	});
} else {
	describe.skip('brands contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

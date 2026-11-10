// @vitest-environment node
import { describe, test } from 'vitest';
import { createCategoryService } from '#modules/catalog/server.ts';
import { runCategoryContract } from './categories.contract.ts';
import { createTestClock } from '../support/clock.ts';
import { createPostgresBrandTestContext } from '../support/database.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('categories contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db, context } = createPostgresBrandTestContext(testDatabaseUrl);

		runCategoryContract({
			service: createCategoryService({ provider: 'postgres', db, clock }),
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

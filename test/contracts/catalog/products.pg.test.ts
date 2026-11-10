// @vitest-environment node
import { describe, test } from 'vitest';
import { createProductService } from '#modules/catalog/server.ts';
import { runProductContract } from './products.contract.ts';
import { createTestClock } from '../support/clock.ts';
import { createPostgresCatalogTestContext } from '../support/database.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('products contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db, context } = createPostgresCatalogTestContext(testDatabaseUrl);

		runProductContract({
			service: createProductService({ provider: 'postgres', db, clock }),
			clock,
			reset: context.reset,
			createActor: context.createActor,
			createBrand: context.createBrand,
			createCategory: context.createCategory
		});
	});
} else {
	describe.skip('products contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

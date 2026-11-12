// @vitest-environment node
import { describe, test } from 'vitest';
import { createCatalogServices } from '#modules/catalog/server.ts';
import { runInventoryContract } from './inventory.contract.ts';
import { createTestClock } from '../support/clock.ts';
import { createPostgresCatalogTestContext } from '../support/database.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('inventory contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db, context } = createPostgresCatalogTestContext(testDatabaseUrl);

		const catalog = createCatalogServices({ provider: 'postgres', db, clock });

		runInventoryContract({
			service: catalog.inventory,
			products: catalog.products,
			clock,
			reset: context.reset,
			createActor: context.createActor,
			createProductWithVariant: context.createProductWithVariant,
			createVariant: context.createVariant
		});
	});
} else {
	describe.skip('inventory contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

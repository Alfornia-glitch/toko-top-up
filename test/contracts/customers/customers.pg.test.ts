// @vitest-environment node
import { describe, test } from 'vitest';
import { createPostgresDb } from '#db/core.ts';
import { createCustomersServices } from '#modules/customers/server.ts';
import { addresses, paymentMethods, wishlists } from '#modules/customers/infra/pg/schema.ts';
import { runCustomersContract } from './customers.contract.ts';
import { createFakeCustomerDirectory } from './directory.ts';
import { createTestClock } from '../support/clock.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('customers contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db } = createPostgresDb(testDatabaseUrl);

		runCustomersContract({
			service: createCustomersServices({
				provider: 'postgres',
				db,
				clock,
				directory: createFakeCustomerDirectory()
			}).customers,
			clock,
			async reset() {
				await db.delete(addresses);
				await db.delete(wishlists);
				await db.delete(paymentMethods);
			}
		});
	});
} else {
	describe.skip('customers contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

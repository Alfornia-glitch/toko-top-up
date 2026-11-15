// @vitest-environment node
import { createSqliteDb } from '#db/sqlite.ts';
import { createCustomersServices } from '#modules/customers/server.ts';
import { addresses, paymentMethods, wishlists } from '#modules/customers/infra/sqlite/schema.ts';
import { runCustomersContract } from './customers.contract.ts';
import { createFakeCustomerDirectory } from './directory.ts';
import { createTestClock } from '../support/clock.ts';

const sqlitePath = process.env.TEST_SQLITE_PATH;

if (!sqlitePath) {
	throw new Error('TEST_SQLITE_PATH is missing; run tests through bun run test');
}

const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
const { db } = createSqliteDb(sqlitePath);

runCustomersContract({
	service: createCustomersServices({
		provider: 'sqlite',
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

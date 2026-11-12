// @vitest-environment node
import { describe, test } from 'vitest';
import { createPostgresDb } from '#db/core.ts';
import { createSupportServices } from '#modules/support/server.ts';
import { supportTicketMessages, supportTickets } from '#modules/support/infra/pg/schema.ts';
import { runSupportContract } from './support.contract.ts';
import { createFakeSupportUsers } from './users.ts';
import { createTestClock } from '../support/clock.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('support contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db } = createPostgresDb(testDatabaseUrl);

		runSupportContract({
			service: createSupportServices({
				provider: 'postgres',
				db,
				clock,
				users: createFakeSupportUsers()
			}).support,
			clock,
			async reset() {
				await db.delete(supportTicketMessages);
				await db.delete(supportTickets);
			}
		});
	});
} else {
	describe.skip('support contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

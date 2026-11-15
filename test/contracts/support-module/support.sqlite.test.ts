// @vitest-environment node
import { createSqliteDb } from '#db/sqlite.ts';
import { createSupportServices } from '#modules/support/server.ts';
import { supportTicketMessages, supportTickets } from '#modules/support/infra/sqlite/schema.ts';
import { runSupportContract } from './support.contract.ts';
import { createFakeSupportUsers } from './users.ts';
import { createTestClock } from '../support/clock.ts';

const sqlitePath = process.env.TEST_SQLITE_PATH;

if (!sqlitePath) {
	throw new Error('TEST_SQLITE_PATH is missing; run tests through bun run test');
}

const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
const { db } = createSqliteDb(sqlitePath);

runSupportContract({
	service: createSupportServices({ provider: 'sqlite', db, clock, users: createFakeSupportUsers() })
		.support,
	clock,
	async reset() {
		await db.delete(supportTicketMessages);
		await db.delete(supportTickets);
	}
});

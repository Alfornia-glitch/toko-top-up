// @vitest-environment node
import { createSqliteDb } from '#db/sqlite.ts';
import { createAuditServices } from '#modules/audit/server.ts';
import { auditLog } from '#modules/audit/infra/sqlite/schema.ts';
import { runAuditContract } from './audit.contract.ts';
import { createTestClock } from '../support/clock.ts';

const sqlitePath = process.env.TEST_SQLITE_PATH;

if (!sqlitePath) {
	throw new Error('TEST_SQLITE_PATH is missing; run tests through pnpm run test');
}

const clock = createTestClock(new Date('2026-04-01T00:00:00.000Z'));
const { db } = createSqliteDb(sqlitePath);

runAuditContract({
	service: createAuditServices({ provider: 'sqlite', db, clock }).audit,
	clock,
	async reset() {
		await db.delete(auditLog);
	}
});

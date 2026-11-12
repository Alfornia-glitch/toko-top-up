// @vitest-environment node
import { describe, test } from 'vitest';
import { createPostgresDb } from '#db/core.ts';
import { createAuditServices } from '#modules/audit/server.ts';
import { auditLog } from '#modules/audit/infra/pg/schema.ts';
import { runAuditContract } from './audit.contract.ts';
import { createTestClock } from '../support/clock.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('audit contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-04-01T00:00:00.000Z'));
		const { db } = createPostgresDb(testDatabaseUrl);

		runAuditContract({
			service: createAuditServices({ provider: 'postgres', db, clock }).audit,
			clock,
			async reset() {
				await db.delete(auditLog);
			}
		});
	});
} else {
	describe.skip('audit contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

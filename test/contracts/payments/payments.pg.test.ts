// @vitest-environment node
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';
import { createPostgresDb } from '#db/core.ts';
import { createPaymentsServices, createLocalProofStorage } from '#modules/payments/server.ts';
import {
	paymentAuditLog,
	paymentProofs,
	paymentRecords
} from '#modules/payments/infra/pg/schema.ts';
import { runPaymentsContract } from './payments.contract.ts';
import { createFakeOrders } from './fake-orders.ts';
import { createTestClock } from '../support/clock.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('payments contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db } = createPostgresDb(testDatabaseUrl);
		const orders = createFakeOrders();
		const expired: string[] = [];

		const services = createPaymentsServices({
			provider: 'postgres',
			db,
			clock,
			orders: orders.services,
			storage: createLocalProofStorage(mkdtempSync(join(tmpdir(), 'proofs-'))),
			config: { qrisImageUrl: '/qris.png', windowMinutes: 30 },
			hooks: {
				async onExpired(orderId) {
					expired.push(orderId);
				}
			}
		});

		async function reset() {
			for (const table of [paymentAuditLog, paymentProofs, paymentRecords]) {
				await db.delete(table);
			}
		}

		runPaymentsContract({ service: services.payments, orders, clock, expired, reset });
	});
} else {
	describe.skip('payments contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

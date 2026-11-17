// @vitest-environment node
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSqliteDb } from '#db/sqlite.ts';
import { createPaymentsServices, createLocalProofStorage } from '#modules/payments/server.ts';
import {
	paymentAuditLog,
	paymentProofs,
	paymentRecords
} from '#modules/payments/infra/sqlite/schema.ts';
import { runPaymentsContract } from './payments.contract.ts';
import { createFakeOrders } from './fake-orders.ts';
import { createTestClock } from '../support/clock.ts';

const sqlitePath = process.env.TEST_SQLITE_PATH;

if (!sqlitePath) {
	throw new Error('TEST_SQLITE_PATH is missing; run tests through pnpm run test');
}

const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
const { db } = createSqliteDb(sqlitePath);
const orders = createFakeOrders();
const expired: string[] = [];

const services = createPaymentsServices({
	provider: 'sqlite',
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

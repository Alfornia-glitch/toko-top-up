// @vitest-environment node
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, expect, test } from 'vitest';
import { unwrap } from '#shared';
import { createSqliteDb } from '#db/sqlite.ts';
import { createPaymentsService, createLocalProofStorage } from '#modules/payments/server.ts';
import { createSqlitePaymentsRepository } from '#modules/payments/infra/sqlite/payments-repository.ts';
import {
	paymentAuditLog,
	paymentProofs,
	paymentRecords
} from '#modules/payments/infra/sqlite/schema.ts';
import { createFakeOrders } from './fake-orders.ts';
import { createForbiddenActor } from '../support/actor.ts';
import { createTestClock } from '../support/clock.ts';

const sqlitePath = process.env.TEST_SQLITE_PATH;
if (!sqlitePath) throw new Error('TEST_SQLITE_PATH is missing; run tests through pnpm run test');

const { db } = createSqliteDb(sqlitePath);
const alice = createForbiddenActor('alice');

beforeEach(async () => {
	for (const table of [paymentAuditLog, paymentProofs, paymentRecords]) await db.delete(table);
});

function build(codes: number[]) {
	const orders = createFakeOrders();
	const queue = [...codes];
	const service = createPaymentsService({
		repository: createSqlitePaymentsRepository(db),
		orders: orders.services,
		storage: createLocalProofStorage(mkdtempSync(join(tmpdir(), 'proofs-'))),
		config: { qrisImageUrl: null, windowMinutes: 30 },
		hooks: { async onExpired() {} },
		clock: createTestClock(new Date('2026-01-01T00:00:00.000Z')),
		randomCode: () => queue.shift() ?? 999
	});
	return { orders, service, remaining: () => queue.length };
}

test('a colliding unique code is retried until a free total is found', async () => {
	const { orders, service, remaining } = build([5, 5, 5, 7]);
	orders.add({ id: 'o1', userId: 'alice' });
	orders.add({ id: 'o2', userId: 'alice' });

	const first = unwrap(await service.createPayment('o1', alice));
	const second = unwrap(await service.createPayment('o2', alice));

	expect(first.uniqueCode).toBe(5);
	expect(second.uniqueCode).toBe(7);
	expect(remaining()).toBe(0);
});

test('gives up with a conflict when no free code can be found', async () => {
	const { orders, service } = build([5, ...Array<number>(30).fill(5)]);
	orders.add({ id: 'o1', userId: 'alice' });
	orders.add({ id: 'o2', userId: 'alice' });
	unwrap(await service.createPayment('o1', alice));
	expect((await service.createPayment('o2', alice)).ok).toBe(false);
});

test('the database itself refuses two open payments with the same total', async () => {
	const repository = createSqlitePaymentsRepository(db);
	const now = new Date();
	const row = (id: string, status: 'pending_payment' | 'paid') => ({
		id,
		orderId: id,
		userId: 'u',
		baseAmount: 1000,
		uniqueCode: 1,
		totalAmount: 1001,
		status,
		expiresAt: now,
		paidAt: null,
		createdAt: now
	});
	const entry = (id: string) => ({
		id: `a-${id}`,
		paymentId: id,
		actorId: null,
		action: 'created',
		note: null,
		createdAt: now
	});

	await repository.insertPayment(row('p1', 'pending_payment'), entry('p1'));
	await expect(
		repository.insertPayment(row('p2', 'pending_payment'), entry('p2'))
	).rejects.toThrow();
	// Closed (paid) payments do not hold the amount.
	await repository.insertPayment(row('p3', 'paid'), entry('p3'));
});

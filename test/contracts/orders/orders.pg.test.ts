// @vitest-environment node
import { describe, test } from 'vitest';
import { createPostgresDb } from '#db/core.ts';
import { createOrdersServices } from '#modules/orders/server.ts';
import {
	orderEvents,
	orderItems,
	orders,
	payments,
	shipments
} from '#modules/orders/infra/pg/schema.ts';
import { runOrdersContract } from './orders.contract.ts';
import { createFakeOrdersUsers } from './users.ts';
import { createTestClock } from '../support/clock.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('orders contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db } = createPostgresDb(testDatabaseUrl);

		runOrdersContract({
			service: createOrdersServices({
				provider: 'postgres',
				db,
				clock,
				users: createFakeOrdersUsers()
			}).orders,
			clock,
			async reset() {
				for (const table of [orderEvents, payments, shipments, orderItems, orders]) {
					await db.delete(table);
				}
			}
		});
	});
} else {
	describe.skip('orders contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

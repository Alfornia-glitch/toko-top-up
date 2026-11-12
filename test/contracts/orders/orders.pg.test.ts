// @vitest-environment node
import { describe, test } from 'vitest';
import { createPostgresDb } from '#db/core.ts';
import { createOrdersServices } from '#modules/orders/server.ts';
import {
	orderEvents,
	orderItems,
	orders,
	payments,
	returnRequestImages,
	returnRequests,
	shipments
} from '#modules/orders/infra/pg/schema.ts';
import { runOrdersContract } from './orders.contract.ts';
import { runReturnsContract } from './returns.contract.ts';
import { createFakeOrdersUsers } from './users.ts';
import { createTestClock } from '../support/clock.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('orders contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db } = createPostgresDb(testDatabaseUrl);

		const services = createOrdersServices({
			provider: 'postgres',
			db,
			clock,
			users: createFakeOrdersUsers()
		});

		async function reset() {
			for (const table of [
				returnRequestImages,
				returnRequests,
				orderEvents,
				payments,
				shipments,
				orderItems,
				orders
			]) {
				await db.delete(table);
			}
		}

		runOrdersContract({
			service: services.orders,
			clock,
			reset
		});

		runReturnsContract({ returns: services.returns, orders: services.orders, clock, reset });
	});
} else {
	describe.skip('orders contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

// @vitest-environment node
import { createSqliteDb } from '#db/core.ts';
import { createOrdersServices } from '#modules/orders/server.ts';
import {
	orderEvents,
	orderItems,
	orders,
	payments,
	returnRequestImages,
	returnRequests,
	shipments
} from '#modules/orders/infra/sqlite/schema.ts';
import { runOrdersContract } from './orders.contract.ts';
import { runReturnsContract } from './returns.contract.ts';
import { createFakeOrdersUsers } from './users.ts';
import { createTestClock } from '../support/clock.ts';

const sqlitePath = process.env.TEST_SQLITE_PATH;

if (!sqlitePath) {
	throw new Error('TEST_SQLITE_PATH is missing; run tests through bun run test');
}

const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
const { db } = createSqliteDb(sqlitePath);

const services = createOrdersServices({
	provider: 'sqlite',
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

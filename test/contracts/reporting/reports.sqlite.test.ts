// @vitest-environment node
import { createSqliteDb } from '#db/sqlite.ts';
import { createEventBus } from '#shared';
import { createCatalogServices } from '#modules/catalog/server.ts';
import { createCustomersServices } from '#modules/customers/server.ts';
import { createOrdersServices } from '#modules/orders/server.ts';
import {
	orderEvents,
	orderItems,
	orders as ordersTable,
	payments,
	returnRequestImages,
	returnRequests,
	shipments
} from '#modules/orders/infra/sqlite/schema.ts';
import { createReportingServices } from '#modules/reporting/server.ts';
import { runReportsContract } from './reports.contract.ts';
import { createFakeOrdersUsers } from '../orders/users.ts';
import { createTestClock } from '../support/clock.ts';
import { createSqliteCatalogTestContext } from '../support/database.ts';

const sqlitePath = process.env.TEST_SQLITE_PATH;

if (!sqlitePath) {
	throw new Error('TEST_SQLITE_PATH is missing; run tests through bun run test');
}

const clock = createTestClock(new Date('2026-02-01T12:00:00.000Z'));
const { db } = createSqliteDb(sqlitePath);
const { context } = createSqliteCatalogTestContext(sqlitePath);

const catalog = createCatalogServices({ provider: 'sqlite', db, clock });
const orders = createOrdersServices({
	provider: 'sqlite',
	db,
	clock,
	users: createFakeOrdersUsers()
});
const customers = createCustomersServices({
	provider: 'sqlite',
	db,
	clock,
	directory: {
		list: async () => ({ data: [], total: 3 }),
		findProfile: async () => null
	}
});
const reporting = createReportingServices({
	provider: 'sqlite',
	db,
	clock,
	catalog,
	orders,
	customers,
	eventBus: createEventBus()
});

runReportsContract({
	reports: reporting.commerce,
	orders: orders.orders,
	catalog,
	clock,
	async reset() {
		for (const table of [
			returnRequestImages,
			returnRequests,
			orderEvents,
			payments,
			shipments,
			orderItems,
			ordersTable
		]) {
			await db.delete(table);
		}
		await context.reset();
	},
	createActor: context.createActor,
	createProductWithVariant: context.createProductWithVariant
});

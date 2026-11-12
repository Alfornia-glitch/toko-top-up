// @vitest-environment node
import { describe, test } from 'vitest';
import { createPostgresDb } from '#db/core.ts';
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
} from '#modules/orders/infra/pg/schema.ts';
import { createReportingServices } from '#modules/reporting/server.ts';
import { runReportsContract } from './reports.contract.ts';
import { createFakeOrdersUsers } from '../orders/users.ts';
import { createTestClock } from '../support/clock.ts';
import { createPostgresCatalogTestContext } from '../support/database.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('reports contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-02-01T12:00:00.000Z'));
		const { db } = createPostgresDb(testDatabaseUrl);
		const { context } = createPostgresCatalogTestContext(testDatabaseUrl);

		const catalog = createCatalogServices({ provider: 'postgres', db, clock });
		const orders = createOrdersServices({
			provider: 'postgres',
			db,
			clock,
			users: createFakeOrdersUsers()
		});
		const customers = createCustomersServices({
			provider: 'postgres',
			db,
			clock,
			directory: {
				list: async () => ({ data: [], total: 3 }),
				findProfile: async () => null
			}
		});
		const reporting = createReportingServices({
			provider: 'postgres',
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
	});
} else {
	describe.skip('reports contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

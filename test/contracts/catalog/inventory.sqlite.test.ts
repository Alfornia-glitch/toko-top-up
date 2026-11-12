// @vitest-environment node
import { createCatalogServices } from '#modules/catalog/server.ts';
import { runInventoryContract } from './inventory.contract.ts';
import { createTestClock } from '../support/clock.ts';
import { createSqliteCatalogTestContext } from '../support/database.ts';

const sqlitePath = process.env.TEST_SQLITE_PATH;

if (!sqlitePath) {
	throw new Error('TEST_SQLITE_PATH is missing; run tests through bun run test');
}

const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
const { db, context } = createSqliteCatalogTestContext(sqlitePath);

runInventoryContract({
	service: createCatalogServices({ provider: 'sqlite', db, clock }).inventory,
	clock,
	reset: context.reset,
	createActor: context.createActor,
	createProductWithVariant: context.createProductWithVariant,
	createVariant: context.createVariant
});

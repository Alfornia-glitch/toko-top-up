// @vitest-environment node
import { createCategoryService } from '#modules/catalog/server.ts';
import { runCategoryContract } from './categories.contract.ts';
import { createTestClock } from '../support/clock.ts';
import { createSqliteBrandTestContext } from '../support/database.ts';

const sqlitePath = process.env.TEST_SQLITE_PATH;

if (!sqlitePath) {
	throw new Error('TEST_SQLITE_PATH is missing; run tests through bun run test');
}

const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
const { db, context } = createSqliteBrandTestContext(sqlitePath);

runCategoryContract({
	service: createCategoryService({ provider: 'sqlite', db, clock }),
	clock,
	reset: context.reset,
	createCategoryProduct: context.createCategoryProduct
});

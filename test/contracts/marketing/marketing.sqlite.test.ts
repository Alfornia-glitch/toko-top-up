// @vitest-environment node
import { createSqliteDb } from '#db/core.ts';
import { createMarketingServices } from '#modules/marketing/server.ts';
import {
	coupons,
	giftCardTransactions,
	giftCards,
	newsletterSubscriptions
} from '#modules/marketing/infra/sqlite/schema.ts';
import { runMarketingContract } from './marketing.contract.ts';
import { createTestClock } from '../support/clock.ts';

const sqlitePath = process.env.TEST_SQLITE_PATH;

if (!sqlitePath) {
	throw new Error('TEST_SQLITE_PATH is missing; run tests through bun run test');
}

const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
const { db } = createSqliteDb(sqlitePath);
const redemptions = new Map<string, number>();

runMarketingContract({
	service: createMarketingServices({
		provider: 'sqlite',
		db,
		clock,
		usage: { countRedemptions: async (id) => redemptions.get(id) ?? 0 }
	}).marketing,
	clock,
	redemptions,
	async reset() {
		await db.delete(giftCardTransactions);
		await db.delete(giftCards);
		await db.delete(coupons);
		await db.delete(newsletterSubscriptions);
	}
});

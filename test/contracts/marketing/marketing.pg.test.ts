// @vitest-environment node
import { describe, test } from 'vitest';
import { createPostgresDb } from '#db/core.ts';
import { createMarketingServices } from '#modules/marketing/server.ts';
import {
	couponRedemptions,
	coupons,
	giftCardTransactions,
	giftCards,
	newsletterSubscriptions
} from '#modules/marketing/infra/pg/schema.ts';
import { runMarketingContract } from './marketing.contract.ts';
import { createTestClock } from '../support/clock.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('marketing contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db } = createPostgresDb(testDatabaseUrl);

		runMarketingContract({
			service: createMarketingServices({
				provider: 'postgres',
				db,
				clock
			}).marketing,
			clock,
			async reset() {
				await db.delete(giftCardTransactions);
				await db.delete(giftCards);
				await db.delete(couponRedemptions);
				await db.delete(coupons);
				await db.delete(newsletterSubscriptions);
			}
		});
	});
} else {
	describe.skip('marketing contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

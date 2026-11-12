// @vitest-environment node
import { describe, test } from 'vitest';
import { createContentServices } from '#modules/content/server.ts';
import { createPostgresDb } from '#db/core.ts';
import {
	announcements,
	banners,
	mediaAssets,
	reviewImages,
	reviews,
	siteSettings,
	testimonials
} from '#modules/content/infra/pg/schema.ts';
import { runContentContract } from './content.contract.ts';
import { createFakeReviewDirectory } from './directory.ts';
import { createTestClock } from '../support/clock.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('content contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db } = createPostgresDb(testDatabaseUrl);
		const directory = createFakeReviewDirectory();
		const services = createContentServices({ provider: 'postgres', db, clock, directory });

		runContentContract({
			service: services.content,
			reviews: services.reviews,
			productNames: directory.productNames,
			async seedReview(review) {
				await db.insert(reviews).values({
					title: null,
					body: null,
					status: 'pending',
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
					...review
				});
			},
			clock,
			async reset() {
				for (const table of [
					reviewImages,
					reviews,
					banners,
					announcements,
					testimonials,
					mediaAssets,
					siteSettings
				]) {
					await db.delete(table);
				}
			}
		});
	});
} else {
	describe.skip('content contract (postgres)', () => {
		test('requires TEST_DATABASE_URL', () => {});
	});
}

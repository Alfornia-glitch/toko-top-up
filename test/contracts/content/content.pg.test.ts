// @vitest-environment node
import { describe, test } from 'vitest';
import { createContentServices } from '#modules/content/server.ts';
import { createPostgresDb } from '#db/core.ts';
import {
	announcements,
	banners,
	mediaAssets,
	siteSettings,
	testimonials
} from '#modules/content/infra/pg/schema.ts';
import { runContentContract } from './content.contract.ts';
import { createTestClock } from '../support/clock.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
	describe('content contract (postgres)', () => {
		const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
		const { db } = createPostgresDb(testDatabaseUrl);

		runContentContract({
			service: createContentServices({ provider: 'postgres', db, clock }).content,
			clock,
			async reset() {
				for (const table of [banners, announcements, testimonials, mediaAssets, siteSettings]) {
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

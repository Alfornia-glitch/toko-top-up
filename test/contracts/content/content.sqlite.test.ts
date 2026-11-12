// @vitest-environment node
import { createContentServices } from '#modules/content/server.ts';
import { createSqliteDb } from '#db/core.ts';
import {
	announcements,
	banners,
	mediaAssets,
	siteSettings,
	testimonials
} from '#modules/content/infra/sqlite/schema.ts';
import { runContentContract } from './content.contract.ts';
import { createTestClock } from '../support/clock.ts';

const sqlitePath = process.env.TEST_SQLITE_PATH;

if (!sqlitePath) {
	throw new Error('TEST_SQLITE_PATH is missing; run tests through bun run test');
}

const clock = createTestClock(new Date('2026-01-01T00:00:00.000Z'));
const { db } = createSqliteDb(sqlitePath);

runContentContract({
	service: createContentServices({ provider: 'sqlite', db, clock }).content,
	clock,
	async reset() {
		for (const table of [banners, announcements, testimonials, mediaAssets, siteSettings]) {
			await db.delete(table);
		}
	}
});

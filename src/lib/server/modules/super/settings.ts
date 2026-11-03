import { asc, eq } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function listSettings() {
	return queryDb.select().from(t.siteSettings).orderBy(asc(t.siteSettings.key));
}

export async function putSettings(values: Record<string, unknown>, updatedBy: string) {
	const now = new Date();
	for (const [key, value] of Object.entries(values)) {
		const [existing] = await queryDb
			.select({ key: t.siteSettings.key })
			.from(t.siteSettings)
			.where(eq(t.siteSettings.key, key))
			.limit(1);

		if (existing) {
			await queryDb
				.update(t.siteSettings)
				.set({ valueJson: value, updatedBy, updatedAt: now })
				.where(eq(t.siteSettings.key, key));
		} else {
			await queryDb.insert(t.siteSettings).values({
				key,
				valueJson: value,
				updatedBy,
				updatedAt: now
			});
		}
	}

	return listSettings();
}

export async function deleteSetting(key: string) {
	const [existing] = await queryDb
		.select({ key: t.siteSettings.key })
		.from(t.siteSettings)
		.where(eq(t.siteSettings.key, key))
		.limit(1);
	if (!existing) return false;
	await queryDb.delete(t.siteSettings).where(eq(t.siteSettings.key, key));
	return true;
}

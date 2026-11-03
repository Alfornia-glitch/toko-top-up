import { count, sum } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { DB_PROVIDER, STORAGE_PROVIDER } from '$app/env/private';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

async function countOf(table: any) {
	const [row] = await queryDb.select({ value: count() }).from(table);
	return Number(row?.value ?? 0);
}

export async function systemInfo() {
	const [users, products, orders, media, audit] = await Promise.all([
		countOf(t.user),
		countOf(t.products),
		countOf(t.orders),
		countOf(t.mediaAssets),
		countOf(t.auditLog)
	]);

	const [storage] = await queryDb
		.select({ value: sum(t.mediaAssets.sizeBytes) })
		.from(t.mediaAssets);

	return {
		bunVersion: Bun.version,
		uptimeSeconds: Math.round(process.uptime()),
		nodeEnv: process.env.NODE_ENV ?? 'development',
		dbProvider: DB_PROVIDER,
		storageProvider: STORAGE_PROVIDER,
		counts: { users, products, orders, media, audit },
		mediaBytes: Number(storage?.value ?? 0),
		memoryBytes: process.memoryUsage().rss
	};
}

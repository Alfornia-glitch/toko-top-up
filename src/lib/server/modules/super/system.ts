import { count } from 'drizzle-orm';
import { unwrap, type Actor } from '#shared';
import { queryDb, tables } from '#db/query.ts';
import { getRuntime } from '#lib/server/runtime.server.ts';
import { DB_PROVIDER, STORAGE_PROVIDER } from '$app/env/private';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

async function countOf(table: any) {
	const [row] = await queryDb.select({ value: count() }).from(table);
	return Number(row?.value ?? 0);
}

export async function systemInfo(actor: Actor | null) {
	const [users, products, orders, mediaStats, audit] = await Promise.all([
		countOf(t.user),
		countOf(t.products),
		countOf(t.orders),
		getRuntime().services.content.content.getMediaStats(actor).then(unwrap),
		countOf(t.auditLog)
	]);

	return {
		bunVersion: Bun.version,
		uptimeSeconds: Math.round(process.uptime()),
		nodeEnv: process.env.NODE_ENV ?? 'development',
		dbProvider: DB_PROVIDER,
		storageProvider: STORAGE_PROVIDER,
		counts: { users, products, orders, media: mediaStats.assets, audit },
		mediaBytes: mediaStats.bytes,
		memoryBytes: process.memoryUsage().rss
	};
}

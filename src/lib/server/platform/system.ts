import { inArray, count } from 'drizzle-orm';
import { unwrap, type Actor } from '#shared';
import { queryDb, tables } from '#db/query.ts';
import { getRuntime } from '#lib/server/runtime.server.ts';
import { DB_PROVIDER, STORAGE_PROVIDER } from '$app/env/private';

const { user } = tables;

async function userCounts() {
	const [[users], [admins]] = await Promise.all([
		queryDb.select({ value: count() }).from(user),
		queryDb
			.select({ value: count() })
			.from(user)
			.where(inArray(user.role, ['admin', 'superadmin']))
	]);
	return { users: Number(users?.value ?? 0), admins: Number(admins?.value ?? 0) };
}

async function productCount(actor: Actor | null): Promise<number> {
	const { catalog } = getRuntime().services;
	return unwrap(await catalog.products.list({ page: 1, pageSize: 1 }, actor as Actor)).total;
}

export async function systemInfo(actor: Actor | null) {
	const { orders, content, audit } = getRuntime().services;
	const [accounts, products, totals, media, auditEntries] = await Promise.all([
		userCounts(),
		productCount(actor),
		orders.orders.getTotals(actor).then(unwrap),
		content.content.getMediaStats(actor).then(unwrap),
		audit.audit.count(actor).then(unwrap)
	]);

	return {
		bunVersion: Bun.version,
		uptimeSeconds: Math.round(process.uptime()),
		nodeEnv: process.env.NODE_ENV ?? 'development',
		dbProvider: DB_PROVIDER,
		storageProvider: STORAGE_PROVIDER,
		counts: {
			users: accounts.users,
			products,
			orders: totals.orderCount,
			media: media.assets,
			audit: auditEntries
		},
		mediaBytes: media.bytes,
		memoryBytes: process.memoryUsage().rss
	};
}

export async function superStats(actor: Actor | null) {
	const { orders, audit } = getRuntime().services;
	const [accounts, products, totals, auditEntries] = await Promise.all([
		userCounts(),
		productCount(actor),
		orders.orders.getTotals(actor).then(unwrap),
		audit.audit.count(actor).then(unwrap)
	]);

	return {
		users: accounts.users,
		admins: accounts.admins,
		orders: totals.orderCount,
		products,
		paidOrders: totals.paidCount,
		auditEntries
	};
}

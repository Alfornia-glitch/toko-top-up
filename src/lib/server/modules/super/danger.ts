import { count, eq, inArray } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { purgeOldAuditLogs } from './audit-logs.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function purgeArchivedProducts() {
	const archived = await queryDb
		.select({ id: t.products.id })
		.from(t.products)
		.where(eq(t.products.status, 'archived'));

	let deleted = 0;

	for (const product of archived) {
		const [refs] = await queryDb
			.select({ value: count() })
			.from(t.orderItems)
			.where(eq(t.orderItems.productId, product.id));
		if (Number(refs?.value ?? 0) > 0) continue;
		await queryDb.delete(t.products).where(eq(t.products.id, product.id));
		deleted += 1;
	}

	return deleted;
}

export async function runDangerAction(action: 'purge_archived_products' | 'purge_old_audit_logs') {
	if (action === 'purge_archived_products') {
		return { action, deleted: await purgeArchivedProducts() };
	}
	return { action, deleted: await purgeOldAuditLogs(90) };
}

export async function superStats() {
	const [[users], [admins], [orders], [products], [revenue], [audit]] = await Promise.all([
		queryDb.select({ value: count() }).from(t.user),
		queryDb
			.select({ value: count() })
			.from(t.user)
			.where(inArray(t.user.role, ['admin', 'superadmin'])),
		queryDb.select({ value: count() }).from(t.orders),
		queryDb.select({ value: count() }).from(t.products),
		queryDb
			.select({ value: count() })
			.from(t.orders)
			.where(inArray(t.orders.status, ['paid', 'processing', 'shipped', 'delivered'])),
		queryDb.select({ value: count() }).from(t.auditLog)
	]);

	return {
		users: Number(users?.value ?? 0),
		admins: Number(admins?.value ?? 0),
		orders: Number(orders?.value ?? 0),
		products: Number(products?.value ?? 0),
		paidOrders: Number(revenue?.value ?? 0),
		auditEntries: Number(audit?.value ?? 0)
	};
}

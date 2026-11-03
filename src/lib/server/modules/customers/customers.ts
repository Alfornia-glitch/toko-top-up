import { and, asc, count, desc, eq, like, or, sum } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import type { CustomerListQuery } from '#lib/server/modules/admin/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function listCustomers(query: CustomerListQuery) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const conditions: any[] = [eq(t.user.role, 'customer')];

	if (query.q) {
		const term = `%${query.q}%`;
		conditions.push(or(like(t.user.email, term), like(t.user.name, term)));
	}

	const where = and(...conditions);
	const rawSort = query.sort ?? '-createdAt';
	const direction = rawSort.startsWith('-') ? 'desc' : 'asc';
	const sortMap: Record<string, unknown> = {
		name: t.user.name,
		email: t.user.email,
		createdAt: t.user.createdAt
	};
	const sortColumn = sortMap[rawSort.replace(/^-/, '')] ?? t.user.createdAt;
	const order = direction === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);
	const offset = (query.page - 1) * query.pageSize;

	const data = await queryDb
		.select({
			id: t.user.id,
			name: t.user.name,
			email: t.user.email,
			image: t.user.image,
			createdAt: t.user.createdAt,
			orderCount: count(t.orders.id),
			spentCents: sum(t.orders.grandTotalCents)
		})
		.from(t.user)
		.leftJoin(t.orders, eq(t.orders.userId, t.user.id))
		.where(where)
		.groupBy(t.user.id, t.user.name, t.user.email, t.user.image, t.user.createdAt)
		.orderBy(order)
		.limit(query.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb.select({ value: count() }).from(t.user).where(where);

	return {
		data: data.map((row: { spentCents: unknown; orderCount: unknown }) => ({
			...row,
			orderCount: Number(row.orderCount ?? 0),
			spentCents: Number(row.spentCents ?? 0)
		})),
		page: query.page,
		pageSize: query.pageSize,
		total: Number(total ?? 0)
	};
}

export async function getCustomer(id: string) {
	const [customer] = await queryDb
		.select({
			id: t.user.id,
			name: t.user.name,
			email: t.user.email,
			image: t.user.image,
			emailVerified: t.user.emailVerified,
			createdAt: t.user.createdAt,
			updatedAt: t.user.updatedAt
		})
		.from(t.user)
		.where(and(eq(t.user.id, id), eq(t.user.role, 'customer')))
		.limit(1);

	if (!customer) return null;

	const [orders, addresses] = await Promise.all([
		queryDb
			.select({
				id: t.orders.id,
				orderNumber: t.orders.orderNumber,
				status: t.orders.status,
				paymentStatus: t.orders.paymentStatus,
				grandTotalCents: t.orders.grandTotalCents,
				currency: t.orders.currency,
				placedAt: t.orders.placedAt
			})
			.from(t.orders)
			.where(eq(t.orders.userId, id))
			.orderBy(desc(t.orders.placedAt)),
		queryDb.select().from(t.addresses).where(eq(t.addresses.userId, id))
	]);

	const spentCents = orders.reduce(
		(total: number, order: { grandTotalCents: number }) => total + order.grandTotalCents,
		0
	);

	return { ...customer, orders, addresses, orderCount: orders.length, spentCents };
}

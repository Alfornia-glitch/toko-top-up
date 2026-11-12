import { and, asc, count, desc, eq, like, or, sum } from 'drizzle-orm';
import type { CustomerSummary } from '#modules/customers/index.ts';
import type { CustomerDirectory } from '#modules/customers/server.ts';
import { queryDb, tables } from '#db/query.ts';

const t = tables as any;

/** Reads user accounts and order history through the legacy shared schema. */
export function createCustomerDirectory(): CustomerDirectory {
	return {
		async list(query) {
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
				.offset((query.page - 1) * query.pageSize);

			const [row] = await queryDb.select({ value: count() }).from(t.user).where(where);

			return {
				data: data.map((entry): CustomerSummary => ({
					...entry,
					orderCount: Number(entry.orderCount ?? 0),
					spentCents: Number(entry.spentCents ?? 0)
				})),
				total: Number(row?.value ?? 0)
			};
		},

		async findProfile(id) {
			const [profile] = await queryDb
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

			if (!profile) return null;

			const orders = await queryDb
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
				.orderBy(desc(t.orders.placedAt));

			return { profile, orders };
		}
	};
}

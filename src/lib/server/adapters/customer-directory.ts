import { and, asc, count, desc, eq, like, or } from 'drizzle-orm';
import { unwrap } from '#shared';
import type { CustomerSummary } from '#modules/customers/index.ts';
import type { CustomerDirectory } from '#modules/customers/server.ts';
import type { OrdersService } from '#modules/orders/server.ts';
import { queryDb, tables } from '#db/query.ts';

const { user } = tables;

const SORTABLE = {
	name: user.name,
	email: user.email,
	createdAt: user.createdAt
} as const;

/**
 * Customer accounts come from the shared auth schema; their order history and
 * spend come from the orders service. `ordersOf` is a getter because orders are
 * created after customers.
 */
export function createCustomerDirectory(ordersOf: () => OrdersService): CustomerDirectory {
	return {
		async list(query, actor) {
			const conditions = [eq(user.role, 'customer')];
			if (query.q) {
				const term = `%${query.q}%`;
				const search = or(like(user.email, term), like(user.name, term));
				if (search) conditions.push(search);
			}
			const where = and(...conditions);

			const rawSort = query.sort ?? '-createdAt';
			const key = rawSort.replace(/^-/, '') as keyof typeof SORTABLE;
			const column = SORTABLE[key] ?? user.createdAt;

			const rows = await queryDb
				.select({
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image,
					createdAt: user.createdAt
				})
				.from(user)
				.where(where)
				.orderBy(rawSort.startsWith('-') ? desc(column) : asc(column))
				.limit(query.pageSize)
				.offset((query.page - 1) * query.pageSize);
			const [totalRow] = await queryDb.select({ value: count() }).from(user).where(where);

			const totals = new Map(
				unwrap(
					await ordersOf().getUserTotals(
						rows.map((row) => row.id),
						actor
					)
				).map((entry) => [entry.userId, entry])
			);

			const data = rows.map((row): CustomerSummary => ({
				...row,
				orderCount: totals.get(row.id)?.orderCount ?? 0,
				spent: totals.get(row.id)?.spent ?? 0
			}));

			return { data, total: Number(totalRow?.value ?? 0) };
		},

		async findProfile(id, actor) {
			const [profile] = await queryDb
				.select({
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image,
					emailVerified: user.emailVerified,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt
				})
				.from(user)
				.where(and(eq(user.id, id), eq(user.role, 'customer')))
				.limit(1);

			if (!profile) return null;

			const placed = unwrap(await ordersOf().listUserOrders(id, actor));
			return {
				profile,
				orders: placed.map((order) => ({
					id: order.id,
					orderNumber: order.orderNumber,
					status: order.status,
					paymentStatus: order.paymentStatus,
					grandTotal: order.grandTotal,
					currency: order.currency,
					placedAt: order.placedAt
				}))
			};
		}
	};
}

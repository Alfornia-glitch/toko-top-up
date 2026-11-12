import { inArray, like, or } from 'drizzle-orm';
import type { OrdersUserDirectory } from '#modules/orders/server.ts';
import { queryDb, tables } from '#db/query.ts';

const { user } = tables;

/** Reads user names and emails through the legacy shared schema. */
export function createOrdersUserDirectory(): OrdersUserDirectory {
	return {
		async findUsers(ids) {
			if (!ids.length) return new Map();
			const rows = await queryDb
				.select({ id: user.id, name: user.name, email: user.email })
				.from(user)
				.where(inArray(user.id, ids));
			return new Map(rows.map((row) => [row.id, { name: row.name, email: row.email }]));
		},

		async findUserIdsMatching(term) {
			const pattern = `%${term}%`;
			const rows = await queryDb
				.select({ id: user.id })
				.from(user)
				.where(or(like(user.email, pattern), like(user.name, pattern)));
			return rows.map((row) => row.id);
		}
	};
}

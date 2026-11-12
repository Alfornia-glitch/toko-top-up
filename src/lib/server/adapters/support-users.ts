import { inArray, like } from 'drizzle-orm';
import type { SupportUserDirectory } from '#modules/support/server.ts';
import { queryDb, tables } from '#db/query.ts';

const { user } = tables;

/** Reads user names and emails through the legacy shared schema. */
export function createSupportUserDirectory(): SupportUserDirectory {
	return {
		async findUsers(ids) {
			if (!ids.length) return new Map();
			const rows = await queryDb
				.select({ id: user.id, name: user.name, email: user.email })
				.from(user)
				.where(inArray(user.id, ids));
			return new Map(rows.map((row) => [row.id, { name: row.name, email: row.email }]));
		},

		async findUserIdsByEmail(term) {
			const rows = await queryDb
				.select({ id: user.id })
				.from(user)
				.where(like(user.email, `%${term}%`));
			return rows.map((row) => row.id);
		}
	};
}

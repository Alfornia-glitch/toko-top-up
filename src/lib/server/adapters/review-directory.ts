import { inArray } from 'drizzle-orm';
import { unwrap } from '#shared';
import type { CatalogServices } from '#modules/catalog/server.ts';
import type { ReviewDirectory } from '#modules/content/server.ts';
import { queryDb, tables } from '#db/query.ts';

const { user } = tables;

/** Reviewer accounts from the shared auth schema; product names from the catalog service. */
export function createReviewDirectory(catalog: Pick<CatalogServices, 'products'>): ReviewDirectory {
	return {
		async findUsers(ids) {
			if (!ids.length) return new Map();
			const rows = await queryDb
				.select({ id: user.id, name: user.name, email: user.email, image: user.image })
				.from(user)
				.where(inArray(user.id, ids));
			return new Map(
				rows.map((row) => [row.id, { name: row.name, email: row.email, image: row.image }])
			);
		},

		async findProductNames(ids) {
			return unwrap(await catalog.products.getProductNames(ids));
		}
	};
}

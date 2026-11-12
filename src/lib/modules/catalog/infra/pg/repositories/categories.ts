import { and, asc, count, eq, ne } from 'drizzle-orm';
import type { PostgresDb } from '#db/core.ts';
import { categories, products } from '../schema.ts';
import type { Category, CategorySummary } from '../../../modules/categories/index.ts';
import type { CategoryRepository, CategoryUpdate } from '../../../modules/categories/server.ts';

type CategoryRow = typeof categories.$inferSelect;

export function createPostgresCategoryRepository(db: PostgresDb): CategoryRepository {
	return {
		async listWithProductCounts() {
			const [rows, counts] = await Promise.all([
				db.select().from(categories).orderBy(asc(categories.position), asc(categories.name)),
				db
					.select({ categoryId: products.categoryId, value: count() })
					.from(products)
					.where(ne(products.status, 'archived'))
					.groupBy(products.categoryId)
			]);

			const countByCategory = new Map<string, number>();
			for (const row of counts) {
				if (row.categoryId !== null) countByCategory.set(row.categoryId, Number(row.value));
			}

			const nameById = new Map(rows.map((row) => [row.id, row.name]));

			return rows.map((row) =>
				toSummary(
					row,
					row.parentId ? (nameById.get(row.parentId) ?? null) : null,
					countByCategory.get(row.id) ?? 0
				)
			);
		},

		async findById(id) {
			const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
			return row ? toCategory(row) : null;
		},

		async findBySlug(slug, excludeId) {
			const where = excludeId
				? and(eq(categories.slug, slug), ne(categories.id, excludeId))
				: eq(categories.slug, slug);
			const [row] = await db.select().from(categories).where(where).limit(1);
			return row ? toCategory(row) : null;
		},

		async countChildren(id) {
			const [row] = await db
				.select({ value: count() })
				.from(categories)
				.where(eq(categories.parentId, id));
			return Number(row?.value ?? 0);
		},

		async countProducts(id) {
			const [row] = await db
				.select({ value: count() })
				.from(products)
				.where(eq(products.categoryId, id));
			return Number(row?.value ?? 0);
		},

		async create(category) {
			await db.insert(categories).values(category);
		},

		async update(id, input: CategoryUpdate) {
			const [row] = await db.update(categories).set(input).where(eq(categories.id, id)).returning();
			return row ? toCategory(row) : null;
		},

		async delete(id) {
			await db.delete(categories).where(eq(categories.id, id));
		}
	};
}

function toCategory(row: CategoryRow): Category {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		parentId: row.parentId,
		description: row.description,
		imageUrl: row.imageUrl,
		position: row.position,
		status: row.status,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

function toSummary(
	row: CategoryRow,
	parentName: string | null,
	productCount: number
): CategorySummary {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		parentId: row.parentId,
		parentName,
		description: row.description,
		imageUrl: row.imageUrl,
		position: row.position,
		status: row.status,
		updatedAt: row.updatedAt,
		productCount
	};
}

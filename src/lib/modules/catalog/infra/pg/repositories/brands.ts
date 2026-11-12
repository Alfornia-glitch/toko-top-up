import { and, asc, count, eq, ne } from 'drizzle-orm';
import type { PostgresDb } from '#db/core.ts';
import { brands, products } from '../schema.ts';
import type { Brand, BrandOption, BrandSummary } from '../../../modules/brands/index.ts';
import type { BrandRepository, BrandUpdate } from '../../../modules/brands/server.ts';

type BrandRow = typeof brands.$inferSelect;

export function createPostgresBrandRepository(db: PostgresDb): BrandRepository {
	return {
		async listWithProductCounts() {
			const [rows, counts] = await Promise.all([
				db.select().from(brands),
				db
					.select({ brandId: products.brandId, value: count() })
					.from(products)
					.groupBy(products.brandId)
			]);

			const countByBrand = new Map<string, number>();
			for (const row of counts) {
				if (row.brandId !== null) countByBrand.set(row.brandId, Number(row.value));
			}

			return rows.map((row) => toSummary(row, countByBrand.get(row.id) ?? 0));
		},

		async findById(id) {
			const [row] = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
			return row ? toBrand(row) : null;
		},

		async findBySlug(slug, excludeId) {
			const where = excludeId
				? and(eq(brands.slug, slug), ne(brands.id, excludeId))
				: eq(brands.slug, slug);
			const [row] = await db.select().from(brands).where(where).limit(1);
			return row ? toBrand(row) : null;
		},

		async countProducts(brandId) {
			const [row] = await db
				.select({ value: count() })
				.from(products)
				.where(eq(products.brandId, brandId));
			return Number(row?.value ?? 0);
		},

		async create(brand) {
			await db.insert(brands).values(brand);
		},

		async update(id, input: BrandUpdate) {
			const [row] = await db.update(brands).set(input).where(eq(brands.id, id)).returning();
			return row ? toBrand(row) : null;
		},

		async delete(id) {
			await db.delete(brands).where(eq(brands.id, id));
		},

		async listActiveOptions() {
			const rows = await db
				.select({ id: brands.id, name: brands.name })
				.from(brands)
				.where(eq(brands.status, 'active'))
				.orderBy(asc(brands.name));
			return rows.map((row): BrandOption => ({ id: row.id, name: row.name }));
		}
	};
}

function toBrand(row: BrandRow): Brand {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		logoUrl: row.logoUrl,
		description: row.description,
		status: row.status,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

function toSummary(row: BrandRow, productCount: number): BrandSummary {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		logoUrl: row.logoUrl,
		description: row.description,
		status: row.status,
		updatedAt: row.updatedAt,
		productCount
	};
}

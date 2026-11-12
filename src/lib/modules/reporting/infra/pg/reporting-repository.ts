import { count, max } from 'drizzle-orm';
import type { PostgresDb } from '#db/core.ts';
import type { CatalogStats, ReportedProduct, ReportingRepository } from '../../domain/reporting.ts';
import { catalogProducts } from './schema.ts';

export function createPostgresReportingRepository(db: PostgresDb): ReportingRepository {
	return {
		async upsertProduct(product: ReportedProduct) {
			await db
				.insert(catalogProducts)
				.values(product)
				.onConflictDoUpdate({
					target: catalogProducts.productId,
					set: { sku: product.sku, status: product.status, updatedAt: product.updatedAt }
				});
		},

		async getStats(): Promise<CatalogStats> {
			const rows = await db
				.select({ status: catalogProducts.status, count: count() })
				.from(catalogProducts)
				.groupBy(catalogProducts.status);

			const [latest] = await db
				.select({ value: max(catalogProducts.updatedAt) })
				.from(catalogProducts);
			const byStatus = rows.map((row) => ({
				status: row.status,
				count: Number(row.count)
			}));

			return {
				total: byStatus.reduce((total, row) => total + row.count, 0),
				byStatus,
				updatedAt: latest?.value ?? null
			};
		}
	};
}

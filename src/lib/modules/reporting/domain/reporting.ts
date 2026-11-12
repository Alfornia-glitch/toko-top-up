import type { Actor } from '#shared';

export type ReportedProductStatus = 'draft' | 'active' | 'archived';

export interface ReportedProduct {
	productId: string;
	sku: string;
	status: ReportedProductStatus;
	updatedAt: Date;
}

export interface CatalogStatusCount {
	status: ReportedProductStatus;
	count: number;
}

export interface CatalogStats {
	total: number;
	byStatus: CatalogStatusCount[];
	updatedAt: Date | null;
}

export interface CatalogSnapshot {
	total: number;
	active: number;
	draft: number;
	archived: number;
}

export interface ReportingRepository {
	upsertProduct(product: ReportedProduct): Promise<void>;
	getStats(): Promise<CatalogStats>;
}

/**
 * Reporting reads catalog data through its public API only. The adapter lives
 * in module.server.ts; the domain never imports catalog internals.
 */
export interface CatalogProductReader {
	countByStatus(actor: Actor): Promise<CatalogSnapshot>;
}

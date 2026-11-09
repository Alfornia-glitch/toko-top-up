import type { Brand, BrandOption, BrandStatus, BrandSummary } from '../domain/brand.ts';

export interface BrandUpdate {
	name: string;
	slug: string;
	logoUrl: string | null;
	description: string | null;
	status: BrandStatus;
	updatedAt: Date;
}

export interface BrandRepository {
	listWithProductCounts(): Promise<BrandSummary[]>;
	findById(id: string): Promise<Brand | null>;
	findBySlug(slug: string, excludeId?: string): Promise<Brand | null>;
	countProducts(brandId: string): Promise<number>;
	create(brand: Brand): Promise<void>;
	update(id: string, input: BrandUpdate): Promise<Brand | null>;
	delete(id: string): Promise<void>;
	listActiveOptions(): Promise<BrandOption[]>;
}

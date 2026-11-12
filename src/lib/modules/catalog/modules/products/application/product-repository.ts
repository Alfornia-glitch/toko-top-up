import type {
	ProductDetail,
	ProductIdentity,
	ProductListQuery,
	ProductStatus,
	ProductSummary,
	ProductWrite,
	VariantSnapshot
} from '../domain/product.ts';

export interface ProductListRecord {
	data: ProductSummary[];
	total: number;
}

export interface ProductCreateMeta {
	id: string;
	slug: string;
	now: Date;
	createdBy: string;
}

export interface ProductUpdateMeta {
	slug: string;
	now: Date;
}

export interface ProductRepository {
	list(query: ProductListQuery): Promise<ProductListRecord>;
	findDetail(id: string): Promise<ProductDetail | null>;
	findById(id: string): Promise<ProductIdentity | null>;
	findBySlug(slug: string, excludeId?: string): Promise<ProductIdentity | null>;
	findBySku(sku: string, excludeId?: string): Promise<ProductIdentity | null>;
	create(input: ProductWrite, meta: ProductCreateMeta): Promise<void>;
	update(id: string, input: ProductWrite, meta: ProductUpdateMeta): Promise<ProductDetail | null>;
	setStatus(id: string, status: ProductStatus, updatedAt: Date): Promise<ProductDetail | null>;
	findVariantSnapshots(variantIds: string[]): Promise<VariantSnapshot[]>;
	findNames(productIds: string[]): Promise<Map<string, string>>;
}

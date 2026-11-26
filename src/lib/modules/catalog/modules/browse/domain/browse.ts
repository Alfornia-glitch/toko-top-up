export type PublicProductSort = 'recommended' | 'popular' | 'price_asc' | 'price_desc' | 'newest';

export interface PublicProductQuery {
	page?: number;
	pageSize?: number;
	q?: string;
	categoryId?: string;
	brandId?: string;
	featured?: boolean;
	deal?: boolean;
	newArrival?: boolean;
	sort?: PublicProductSort;
	minPrice?: number;
	maxPrice?: number;
	minRating?: number;
	color?: string;
	inStock?: boolean;
}

/** Repository-level filter: active products only, plus these optional narrowing conditions. */
export interface PublicProductFilter {
	q?: string | undefined;
	categoryId?: string | undefined;
	brandId?: string | undefined;
	featured?: boolean | undefined;
	deal?: boolean | undefined;
	newArrival?: boolean | undefined;
	minPrice?: number | undefined;
	maxPrice?: number | undefined;
	/** Minimum average rating in stars; stored ratings are hundredths. */
	minRating?: number | undefined;
	ids?: string[] | undefined;
}

export interface PublicProductRow {
	id: string;
	sku: string;
	name: string;
	slug: string;
	shortDescription: string | null;
	price: number;
	compareAtPrice: number | null;
	currency: string;
	ratingAvg: number;
	ratingCount: number;
	soldCount: number;
	isFeatured: boolean;
	isNewArrival: boolean;
	isDeal: boolean;
	dealEndsAt: Date | null;
	brandName: string | null;
	categoryName: string | null;
	createdAt: Date;
}

export interface PublicProduct extends PublicProductRow {
	imageUrl: string | null;
	stock: number;
}

export interface PublicBrand {
	id: string;
	name: string;
	slug: string;
	logoUrl: string | null;
}

export interface PublicCategory {
	id: string;
	name: string;
	slug: string;
	parentId: string | null;
	description: string | null;
	imageUrl: string | null;
	position: number;
	productCount: number;
}

export interface PublicFacets {
	brands: PublicBrand[];
	categories: Array<{ id: string; name: string; slug: string }>;
	price: { min: number; max: number };
	colors: string[];
	discounts: number[];
}

export interface PublicProductList {
	data: PublicProduct[];
	page: number;
	pageSize: number;
	total: number;
	facets: PublicFacets;
}

export interface PublicProductImage {
	id: string;
	productId: string;
	url: string;
	alt: string | null;
	position: number;
}

export interface PublicProductOptionValue {
	id: string;
	optionId: string;
	value: string;
	position: number;
}

export interface PublicProductOption {
	id: string;
	productId: string;
	name: string;
	position: number;
	values: PublicProductOptionValue[];
}

export interface PublicProductVariant {
	id: string;
	productId: string;
	sku: string;
	name: string;
	price: number;
	compareAtPrice: number | null;
	stock: number;
	status: string;
	optionValuesJson: Record<string, string> | null;
}

/** The catalog-owned part of a product page; reviews and related products are composed elsewhere. */
export interface PublicProductDetail {
	id: string;
	sku: string;
	name: string;
	slug: string;
	description: string | null;
	shortDescription: string | null;
	price: number;
	compareAtPrice: number | null;
	currency: string;
	ratingAvg: number;
	ratingCount: number;
	soldCount: number;
	shippingInfo: string | null;
	returnPolicy: string | null;
	brandId: string | null;
	categoryId: string | null;
	brandName: string | null;
	categoryName: string | null;
	images: PublicProductImage[];
	options: PublicProductOption[];
	variants: PublicProductVariant[];
}

export interface ProductExtras {
	imageByProduct: Map<string, string>;
	stockByProduct: Map<string, number>;
	/** Option-values JSON of each product's active variants, for colour extraction. */
	variantOptionsByProduct: Map<string, Array<Record<string, string> | null>>;
}

export interface FacetSource {
	brands: PublicBrand[];
	categories: Array<{ id: string; name: string; slug: string }>;
	min: number;
	max: number;
	discountRows: Array<{ price: number; compareAtPrice: number | null }>;
	colorRows: Array<Record<string, string> | null>;
}

export interface BrowseRepository {
	selectProducts(
		filter: PublicProductFilter,
		sort: PublicProductSort | undefined,
		limit: number,
		offset?: number
	): Promise<PublicProductRow[]>;
	countProducts(filter: PublicProductFilter): Promise<number>;
	loadExtras(productIds: string[], includeColors: boolean): Promise<ProductExtras>;
	loadFacetSource(): Promise<FacetSource>;
	findProductBySlug(
		slug: string
	): Promise<Omit<PublicProductDetail, 'images' | 'options' | 'variants'> | null>;
	loadProductParts(
		productId: string
	): Promise<Pick<PublicProductDetail, 'images' | 'options' | 'variants'>>;
	listCategories(): Promise<Array<Omit<PublicCategory, 'productCount'>>>;
	countProductsByCategory(): Promise<Map<string, number>>;
	listBrands(): Promise<PublicBrand[]>;
	productIsActive(id: string): Promise<boolean>;
}

function firstUpper(value: string): string {
	const trimmed = value.trim();
	return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : '';
}

/** Colour names from a variant's option values (`Color` or `Colour`), capitalised. */
export function colorsFromOptionValues(value: unknown): string[] {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
	const colors: string[] = [];
	for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
		const normalized = key.trim().toLowerCase();
		if (normalized !== 'color' && normalized !== 'colour') continue;
		if (typeof raw !== 'string') continue;
		const color = firstUpper(raw);
		if (color) colors.push(color);
	}
	return colors;
}

/** Distinct colours, case-insensitively, keeping first-seen casing. */
export function distinctColors(values: Iterable<unknown>): string[] {
	const seen = new Map<string, string>();
	for (const value of values) {
		for (const color of colorsFromOptionValues(value)) {
			const key = color.toLowerCase();
			if (!seen.has(key)) seen.set(key, color);
		}
	}
	return [...seen.values()];
}

/** Whole-percent discounts present across products, ascending. */
export function discountPercents(
	rows: Array<{ price: number; compareAtPrice: number | null }>
): number[] {
	const set = new Set<number>();
	for (const row of rows) {
		const price = Number(row.price ?? 0);
		const compareAt = Number(row.compareAtPrice ?? 0);
		if (!compareAt || compareAt <= price) continue;
		const percent = Math.round(((compareAt - price) / compareAt) * 100);
		if (percent > 0) set.add(percent);
	}
	return [...set].sort((a, b) => a - b);
}

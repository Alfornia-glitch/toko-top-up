import { api, unwrap } from '../shared/http.ts';
import type { ProductDetail, ProductListResult } from './models.ts';

export interface ProductQuery {
	page?: number;
	pageSize?: number;
	q?: string;
	categoryId?: string;
	brandId?: string;
	featured?: boolean;
	deal?: boolean;
	newArrival?: boolean;
	sort?: 'recommended' | 'popular' | 'price_asc' | 'price_desc' | 'newest';
	minPrice?: number;
	maxPrice?: number;
	minRating?: number;
	color?: string;
	inStock?: boolean;
}

export function productSearchParams(query: ProductQuery = {}): URLSearchParams {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null || value === '' || value === false) continue;
		params.set(key, String(value));
	}

	return params;
}

export function listProducts(query: ProductQuery = {}): Promise<ProductListResult> {
	const search = productSearchParams(query).toString();
	return api.get<ProductListResult>(`/api/storefront/products${search ? `?${search}` : ''}`);
}

export async function getProduct(slug: string): Promise<ProductDetail> {
	const payload = await api.get<{ data: ProductDetail }>(
		`/api/storefront/products/${encodeURIComponent(slug)}`
	);

	return unwrap(payload);
}

import { err, ok, toAppError, type AppError, type Result } from '#shared';
import {
	discountPercents,
	distinctColors,
	type BrowseRepository,
	type PublicBrand,
	type PublicCategory,
	type PublicFacets,
	type PublicProduct,
	type PublicProductDetail,
	type PublicProductFilter,
	type PublicProductList,
	type PublicProductQuery,
	type PublicProductRow
} from '../domain/browse.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

/** Colour and in-stock filters run in memory, over at most this many candidates. */
const POST_FILTER_CANDIDATE_LIMIT = 500;
const MAX_PAGE_SIZE = 60;

/** Public, read-only catalog browsing. Needs no actor. */
export interface BrowseService {
	listProducts(query?: PublicProductQuery): Outcome<PublicProductList>;
	/** Active products by id, in the order requested; unknown or inactive ids are omitted. */
	listProductsByIds(ids: string[]): Outcome<PublicProduct[]>;
	/** The catalog-owned part of an active product's page, or null. */
	getProduct(slug: string): Outcome<PublicProductDetail | null>;
	listCategories(): Outcome<PublicCategory[]>;
	listBrands(): Outcome<PublicBrand[]>;
	isProductActive(id: string): Outcome<boolean>;
}

export function createBrowseService(repository: BrowseRepository): BrowseService {
	async function run<T>(action: () => Promise<T>): Outcome<T> {
		try {
			return ok(await action());
		} catch (error) {
			return err(toAppError(error));
		}
	}

	async function withExtras(rows: PublicProductRow[], includeColors = false) {
		const extras = await repository.loadExtras(
			rows.map((row) => row.id),
			includeColors
		);
		const colorsByProduct = new Map<string, string[]>();
		for (const [productId, options] of extras.variantOptionsByProduct) {
			colorsByProduct.set(productId, distinctColors(options));
		}

		return {
			data: rows.map<PublicProduct>((row) => ({
				...row,
				imageUrl: extras.imageByProduct.get(row.id) ?? null,
				stock: extras.stockByProduct.get(row.id) ?? 0
			})),
			colorsByProduct
		};
	}

	async function facets(): Promise<PublicFacets> {
		const source = await repository.loadFacetSource();
		return {
			brands: source.brands,
			categories: source.categories,
			price: { minCents: source.minCents, maxCents: source.maxCents },
			colors: distinctColors(source.colorRows).sort((a, b) => a.localeCompare(b)),
			discounts: discountPercents(source.discountRows)
		};
	}

	return {
		listProducts: (query = {}) =>
			run(async () => {
				const page = query.page ?? 1;
				const pageSize = Math.min(query.pageSize ?? 24, MAX_PAGE_SIZE);
				const offset = (page - 1) * pageSize;
				const filter: PublicProductFilter = {
					q: query.q,
					categoryId: query.categoryId,
					brandId: query.brandId,
					featured: query.featured,
					deal: query.deal,
					newArrival: query.newArrival,
					minPrice: query.minPrice,
					maxPrice: query.maxPrice,
					minRating: query.minRating
				};
				const postFilter = Boolean(query.color) || query.inStock === true;

				let data: PublicProduct[];
				let total: number;

				if (postFilter) {
					const candidates = await repository.selectProducts(
						filter,
						query.sort,
						POST_FILTER_CANDIDATE_LIMIT
					);
					const enriched = await withExtras(candidates, true);
					let filtered = enriched.data;
					if (query.color) {
						const target = query.color.trim().toLowerCase();
						filtered = filtered.filter((row) =>
							(enriched.colorsByProduct.get(row.id) ?? []).some(
								(color) => color.toLowerCase() === target
							)
						);
					}
					if (query.inStock === true) filtered = filtered.filter((row) => row.stock > 0);

					total = filtered.length;
					data = filtered.slice(offset, offset + pageSize);
				} else {
					const rows = await repository.selectProducts(filter, query.sort, pageSize, offset);
					data = (await withExtras(rows)).data;
					total = await repository.countProducts(filter);
				}

				return { data, page, pageSize, total, facets: await facets() };
			}),

		listProductsByIds: (ids) =>
			run(async () => {
				if (!ids.length) return [];
				const rows = await repository.selectProducts({ ids }, 'newest', ids.length);
				const { data } = await withExtras(rows);
				const byId = new Map(data.map((row) => [row.id, row]));
				return ids.flatMap((id) => {
					const row = byId.get(id);
					return row ? [row] : [];
				});
			}),

		getProduct: (slug) =>
			run(async () => {
				const base = await repository.findProductBySlug(slug);
				if (!base) return null;
				return { ...base, ...(await repository.loadProductParts(base.id)) };
			}),

		listCategories: () =>
			run(async () => {
				const [rows, counts] = await Promise.all([
					repository.listCategories(),
					repository.countProductsByCategory()
				]);
				return rows.map((row) => ({ ...row, productCount: counts.get(row.id) ?? 0 }));
			}),

		listBrands: () => run(() => repository.listBrands()),

		isProductActive: (id) => run(() => repository.productIsActive(id))
	};
}

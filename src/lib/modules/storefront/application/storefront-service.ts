import {
	NotFoundError,
	assertActor,
	err,
	ok,
	toAppError,
	unwrap,
	type Actor,
	type AppError,
	type Result
} from '#shared';
import type {
	PublicBrand,
	PublicCategory,
	PublicProduct,
	PublicProductDetail,
	PublicProductList,
	PublicProductQuery
} from '#modules/catalog/index.ts';
import type { CatalogServices } from '#modules/catalog/server.ts';
import type { ContentServices } from '#modules/content/server.ts';
import type { ContentItem } from '#modules/content/index.ts';
import type { CustomersServices } from '#modules/customers/server.ts';
import { resolveSiteSettings, type SiteSettings } from '../domain/site-settings.ts';
import {
	RELATED_CANDIDATE_LIMIT,
	RELATED_PRODUCT_LIMIT,
	REVIEW_LIMIT,
	type ProductReview,
	type ProductReviewReader,
	type RatingBuckets
} from '../domain/storefront.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

export interface HomePage {
	banners: ContentItem[];
	announcements: ContentItem[];
	testimonials: ContentItem[];
	categories: PublicCategory[];
	brands: PublicBrand[];
	deals: PublicProduct[];
	newArrivals: PublicProduct[];
	featured: PublicProduct[];
	popular: PublicProduct[];
}

export interface ProductPage extends PublicProductDetail {
	reviews: ProductReview[];
	ratingBuckets: RatingBuckets;
	related: PublicProduct[];
}

export interface WishlistProduct extends PublicProduct {
	wishlistedAt: Date;
}

export interface StorefrontDependencies {
	catalog: Pick<CatalogServices, 'browse'>;
	content: Pick<ContentServices, 'content'>;
	customers: Pick<CustomersServices, 'customers'>;
	reviews: ProductReviewReader;
}

/** The public shop: everything a visitor or customer sees, composed from other modules. */
export interface StorefrontService {
	getHome(): Outcome<HomePage>;
	listProducts(query?: PublicProductQuery): Outcome<PublicProductList>;
	/** Fails with 404 when the product does not exist or is not active. */
	getProduct(slug: string): Outcome<ProductPage>;
	listCategories(): Outcome<PublicCategory[]>;
	getSiteSettings(): Outcome<SiteSettings>;

	/** Wishlist operations act on the calling actor's own list. */
	listWishlist(actor: Actor | null): Outcome<WishlistProduct[]>;
	/** Idempotent; fails with 404 when the product is not an active product. */
	addToWishlist(productId: string, actor: Actor | null): Outcome<{ id: string; productId: string }>;
	removeFromWishlist(productId: string, actor: Actor | null): Outcome<string>;
}

export function createStorefrontService(dependencies: StorefrontDependencies): StorefrontService {
	const { catalog, content, customers, reviews } = dependencies;
	const browse = catalog.browse;

	async function run<T>(action: () => Promise<T>): Outcome<T> {
		try {
			return ok(await action());
		} catch (error) {
			return err(toAppError(error));
		}
	}

	return {
		getHome: () =>
			run(async () => {
				const [publicContent, categories, brands, deals, newArrivals, featured, popular] =
					await Promise.all([
						content.content.getPublicContent().then(unwrap),
						browse.listCategories().then(unwrap),
						browse.listBrands().then(unwrap),
						browse.listProducts({ deal: true, pageSize: 8 }).then(unwrap),
						browse.listProducts({ newArrival: true, pageSize: 8 }).then(unwrap),
						browse.listProducts({ featured: true, pageSize: 8 }).then(unwrap),
						browse.listProducts({ sort: 'popular', pageSize: 8 }).then(unwrap)
					]);

				return {
					banners: publicContent.banners,
					announcements: publicContent.announcements,
					testimonials: publicContent.testimonials,
					categories,
					brands,
					deals: deals.data,
					newArrivals: newArrivals.data,
					featured: featured.data,
					popular: popular.data
				};
			}),

		listProducts: (query) => browse.listProducts(query),

		getProduct: (slug) =>
			run(async () => {
				const product = unwrap(await browse.getProduct(slug));
				if (!product) throw new NotFoundError('Product not found');

				const [reviewRows, ratingBuckets, byCategory, byBrand] = await Promise.all([
					reviews.listApproved(product.id, REVIEW_LIMIT),
					reviews.ratingBuckets(product.id),
					product.categoryId
						? browse
								.listProducts({ categoryId: product.categoryId, pageSize: RELATED_CANDIDATE_LIMIT })
								.then(unwrap)
						: Promise.resolve(null),
					product.brandId
						? browse
								.listProducts({ brandId: product.brandId, pageSize: RELATED_CANDIDATE_LIMIT })
								.then(unwrap)
						: Promise.resolve(null)
				]);

				const seen = new Set<string>([product.id]);
				const related: PublicProduct[] = [];
				for (const row of [...(byCategory?.data ?? []), ...(byBrand?.data ?? [])]) {
					if (seen.has(row.id)) continue;
					seen.add(row.id);
					related.push(row);
					if (related.length >= RELATED_PRODUCT_LIMIT) break;
				}

				return { ...product, reviews: reviewRows, ratingBuckets, related };
			}),

		listCategories: () => browse.listCategories(),

		getSiteSettings: () =>
			run(async () => resolveSiteSettings(unwrap(await content.content.listSettings()))),

		listWishlist: (actor) =>
			run(async () => {
				const entries = unwrap(await customers.customers.listWishlist(actor));
				const products = unwrap(await browse.listProductsByIds(entries.map((e) => e.productId)));
				const byId = new Map(products.map((product) => [product.id, product]));

				return entries.flatMap((entry) => {
					const product = byId.get(entry.productId);
					return product ? [{ ...product, wishlistedAt: entry.createdAt }] : [];
				});
			}),

		addToWishlist: (productId, actor) =>
			run(async () => {
				assertActor(actor);
				if (!unwrap(await browse.isProductActive(productId))) {
					throw new NotFoundError('Product not found');
				}
				const entry = unwrap(await customers.customers.addWishlist(productId, actor));
				return { id: entry.id, productId: entry.productId };
			}),

		removeFromWishlist: (productId, actor) =>
			run(async () => unwrap(await customers.customers.removeWishlist(productId, actor)))
	};
}

import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	inArray,
	isNotNull,
	like,
	lte,
	max,
	min,
	or,
	sum
} from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

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

const productRowSelect = {
	id: t.products.id,
	sku: t.products.sku,
	name: t.products.name,
	slug: t.products.slug,
	shortDescription: t.products.shortDescription,
	priceCents: t.products.priceCents,
	compareAtPriceCents: t.products.compareAtPriceCents,
	currency: t.products.currency,
	ratingAvg: t.products.ratingAvg,
	ratingCount: t.products.ratingCount,
	soldCount: t.products.soldCount,
	isFeatured: t.products.isFeatured,
	isNewArrival: t.products.isNewArrival,
	isDeal: t.products.isDeal,
	dealEndsAt: t.products.dealEndsAt,
	brandName: t.brands.name,
	categoryName: t.categories.name,
	createdAt: t.products.createdAt
};

const postFilterCandidateLimit = 500;

function firstUpper(value: string) {
	const trimmed = value.trim();
	if (!trimmed) return '';
	return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function isColorOption(key: string) {
	const normalized = key.trim().toLowerCase();
	return normalized === 'color' || normalized === 'colour';
}

function colorsFromOptionValues(value: unknown) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return [] as string[];
	const colors: string[] = [];
	for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
		if (!isColorOption(key) || typeof raw !== 'string') continue;
		const color = firstUpper(raw);
		if (color) colors.push(color);
	}
	return colors;
}

async function loadRowExtras(ids: string[], includeColors = false) {
	const imageMap = new Map<string, string>();
	const stockMap = new Map<string, number>();
	const colorMap = new Map<string, string[]>();
	if (!ids.length) return { imageMap, stockMap, colorMap };

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const variantsPromise: Promise<any[]> = includeColors
		? queryDb
				.select({
					productId: t.productVariants.productId,
					optionValuesJson: t.productVariants.optionValuesJson
				})
				.from(t.productVariants)
				.where(
					and(inArray(t.productVariants.productId, ids), eq(t.productVariants.status, 'active'))
				)
		: Promise.resolve([]);

	const [images, stock, variantRows] = await Promise.all([
		queryDb
			.select({ productId: t.productImages.productId, url: t.productImages.url })
			.from(t.productImages)
			.where(inArray(t.productImages.productId, ids))
			.orderBy(asc(t.productImages.position)),
		queryDb
			.select({ productId: t.productVariants.productId, value: sum(t.productVariants.stock) })
			.from(t.productVariants)
			.where(inArray(t.productVariants.productId, ids))
			.groupBy(t.productVariants.productId),
		variantsPromise
	]);

	for (const image of images)
		if (!imageMap.has(image.productId)) imageMap.set(image.productId, image.url);
	for (const row of stock) stockMap.set(row.productId, Number(row.value ?? 0));
	for (const row of variantRows) {
		const existing = colorMap.get(row.productId) ?? [];
		for (const color of colorsFromOptionValues(row.optionValuesJson)) {
			if (!existing.some((current) => current.toLowerCase() === color.toLowerCase()))
				existing.push(color);
		}
		colorMap.set(row.productId, existing);
	}

	return { imageMap, stockMap, colorMap };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function attachExtras(rows: any[], includeColors = false) {
	const ids = rows.map((row: { id: string }) => row.id);
	const { imageMap, stockMap, colorMap } = await loadRowExtras(ids, includeColors);

	return {
		data: rows.map((row: (typeof rows)[number]) => ({
			...row,
			imageUrl: imageMap.get(row.id) ?? null,
			stock: stockMap.get(row.id) ?? 0
		})),
		colorMap
	};
}

async function loadFacets() {
	const [brandRows, categoryRows, priceRows, discountRows, colorRows] = await Promise.all([
		queryDb
			.select({
				id: t.brands.id,
				name: t.brands.name,
				slug: t.brands.slug,
				logoUrl: t.brands.logoUrl
			})
			.from(t.brands)
			.where(eq(t.brands.status, 'active'))
			.orderBy(asc(t.brands.name)),
		queryDb
			.select({ id: t.categories.id, name: t.categories.name, slug: t.categories.slug })
			.from(t.categories)
			.where(eq(t.categories.status, 'active'))
			.orderBy(asc(t.categories.position), asc(t.categories.name)),
		queryDb
			.select({
				minCents: min(t.products.priceCents),
				maxCents: max(t.products.priceCents)
			})
			.from(t.products)
			.where(eq(t.products.status, 'active')),
		queryDb
			.select({
				priceCents: t.products.priceCents,
				compareAtPriceCents: t.products.compareAtPriceCents
			})
			.from(t.products)
			.where(and(eq(t.products.status, 'active'), isNotNull(t.products.compareAtPriceCents))),
		queryDb
			.select({ optionValuesJson: t.productVariants.optionValuesJson })
			.from(t.productVariants)
			.innerJoin(t.products, eq(t.productVariants.productId, t.products.id))
			.where(and(eq(t.products.status, 'active'), eq(t.productVariants.status, 'active')))
	]);

	const discountSet = new Set<number>();
	for (const row of discountRows) {
		const price = Number(row.priceCents ?? 0);
		const compareAt = Number(row.compareAtPriceCents ?? 0);
		if (!compareAt || compareAt <= price) continue;
		const percent = Math.round(((compareAt - price) / compareAt) * 100);
		if (percent > 0) discountSet.add(percent);
	}

	const colorMap = new Map<string, string>();
	for (const row of colorRows) {
		for (const color of colorsFromOptionValues(row.optionValuesJson)) {
			const key = color.toLowerCase();
			if (!colorMap.has(key)) colorMap.set(key, color);
		}
	}

	return {
		brands: brandRows,
		categories: categoryRows,
		price: {
			minCents: Number(priceRows[0]?.minCents ?? 0),
			maxCents: Number(priceRows[0]?.maxCents ?? 0)
		},
		colors: Array.from(colorMap.values()).sort((a, b) => a.localeCompare(b)),
		discounts: Array.from(discountSet).sort((a, b) => a - b)
	};
}

function sortOrder(sort: PublicProductSort | undefined) {
	switch (sort) {
		case 'popular':
			return [desc(t.products.soldCount), desc(t.products.createdAt)];
		case 'price_asc':
			return [asc(t.products.priceCents), desc(t.products.createdAt)];
		case 'price_desc':
			return [desc(t.products.priceCents), desc(t.products.createdAt)];
		case 'newest':
			return [desc(t.products.createdAt)];
		case 'recommended':
		default:
			return [desc(t.products.isFeatured), desc(t.products.createdAt)];
	}
}

export async function listPublicProducts(query: PublicProductQuery = {}) {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 24, 60);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const conditions: any[] = [eq(t.products.status, 'active')];

	if (query.q) {
		const term = `%${query.q}%`;
		conditions.push(or(like(t.products.name, term), like(t.products.sku, term)));
	}
	if (query.categoryId) conditions.push(eq(t.products.categoryId, query.categoryId));
	if (query.brandId) conditions.push(eq(t.products.brandId, query.brandId));
	if (query.featured) conditions.push(eq(t.products.isFeatured, true));
	if (query.deal) conditions.push(eq(t.products.isDeal, true));
	if (query.newArrival) conditions.push(eq(t.products.isNewArrival, true));
	if (typeof query.minPrice === 'number')
		conditions.push(gte(t.products.priceCents, query.minPrice));
	if (typeof query.maxPrice === 'number')
		conditions.push(lte(t.products.priceCents, query.maxPrice));
	if (typeof query.minRating === 'number')
		conditions.push(gte(t.products.ratingAvg, query.minRating * 100));

	const where = and(...conditions);
	const offset = (page - 1) * pageSize;
	const orderBy = sortOrder(query.sort);
	const hasPostFilter = Boolean(query.color) || query.inStock === true;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let data: any[];
	let total: number;

	if (hasPostFilter) {
		const candidates = await queryDb
			.select(productRowSelect)
			.from(t.products)
			.leftJoin(t.brands, eq(t.products.brandId, t.brands.id))
			.leftJoin(t.categories, eq(t.products.categoryId, t.categories.id))
			.where(where)
			.orderBy(...orderBy)
			.limit(postFilterCandidateLimit);

		const enriched = await attachExtras(candidates, true);
		let filtered = enriched.data;
		if (query.color) {
			const target = query.color.trim().toLowerCase();
			filtered = filtered.filter((row: { id: string }) =>
				(enriched.colorMap.get(row.id) ?? []).some((color) => color.toLowerCase() === target)
			);
		}
		if (query.inStock === true) {
			filtered = filtered.filter((row: { stock: number }) => row.stock > 0);
		}

		total = filtered.length;
		data = filtered.slice(offset, offset + pageSize);
	} else {
		const rows = await queryDb
			.select(productRowSelect)
			.from(t.products)
			.leftJoin(t.brands, eq(t.products.brandId, t.brands.id))
			.leftJoin(t.categories, eq(t.products.categoryId, t.categories.id))
			.where(where)
			.orderBy(...orderBy)
			.limit(pageSize)
			.offset(offset);

		const enriched = await attachExtras(rows);
		data = enriched.data;

		const [{ value }] = await queryDb.select({ value: count() }).from(t.products).where(where);
		total = Number(value ?? 0);
	}

	const facets = await loadFacets();

	return {
		data,
		page,
		pageSize,
		total,
		facets
	};
}

export async function getPublicProduct(slug: string) {
	const [product] = await queryDb
		.select({
			id: t.products.id,
			sku: t.products.sku,
			name: t.products.name,
			slug: t.products.slug,
			description: t.products.description,
			shortDescription: t.products.shortDescription,
			priceCents: t.products.priceCents,
			compareAtPriceCents: t.products.compareAtPriceCents,
			currency: t.products.currency,
			ratingAvg: t.products.ratingAvg,
			ratingCount: t.products.ratingCount,
			soldCount: t.products.soldCount,
			shippingInfo: t.products.shippingInfo,
			returnPolicy: t.products.returnPolicy,
			brandId: t.products.brandId,
			categoryId: t.products.categoryId,
			brandName: t.brands.name,
			categoryName: t.categories.name
		})
		.from(t.products)
		.leftJoin(t.brands, eq(t.products.brandId, t.brands.id))
		.leftJoin(t.categories, eq(t.products.categoryId, t.categories.id))
		.where(and(eq(t.products.slug, slug), eq(t.products.status, 'active')))
		.limit(1);

	if (!product) return null;

	const [images, options, variants, reviewRows, bucketRows] = await Promise.all([
		queryDb
			.select()
			.from(t.productImages)
			.where(eq(t.productImages.productId, product.id))
			.orderBy(asc(t.productImages.position)),
		queryDb
			.select()
			.from(t.productOptions)
			.where(eq(t.productOptions.productId, product.id))
			.orderBy(asc(t.productOptions.position)),
		queryDb
			.select()
			.from(t.productVariants)
			.where(
				and(eq(t.productVariants.productId, product.id), eq(t.productVariants.status, 'active'))
			)
			.orderBy(asc(t.productVariants.priceCents)),
		queryDb
			.select({
				id: t.reviews.id,
				rating: t.reviews.rating,
				title: t.reviews.title,
				body: t.reviews.body,
				helpfulCount: t.reviews.helpfulCount,
				createdAt: t.reviews.createdAt,
				customerName: t.user.name,
				customerImage: t.user.image
			})
			.from(t.reviews)
			.leftJoin(t.user, eq(t.reviews.userId, t.user.id))
			.where(and(eq(t.reviews.productId, product.id), eq(t.reviews.status, 'approved')))
			.orderBy(desc(t.reviews.createdAt))
			.limit(50),
		queryDb
			.select({ rating: t.reviews.rating, value: count() })
			.from(t.reviews)
			.where(and(eq(t.reviews.productId, product.id), eq(t.reviews.status, 'approved')))
			.groupBy(t.reviews.rating)
	]);

	const ratingBuckets: Record<'1' | '2' | '3' | '4' | '5', number> = {
		'1': 0,
		'2': 0,
		'3': 0,
		'4': 0,
		'5': 0
	};
	for (const row of bucketRows) {
		const key = String(row.rating) as keyof typeof ratingBuckets;
		if (key in ratingBuckets) ratingBuckets[key] = Number(row.value ?? 0);
	}

	const optionIds = options.map((option: { id: string }) => option.id);
	const values = optionIds.length
		? await queryDb
				.select()
				.from(t.productOptionValues)
				.where(inArray(t.productOptionValues.optionId, optionIds))
				.orderBy(asc(t.productOptionValues.position))
		: [];

	const [byCategory, byBrand] = await Promise.all([
		product.categoryId
			? listPublicProducts({ categoryId: product.categoryId, pageSize: 12 })
			: Promise.resolve(null),
		product.brandId
			? listPublicProducts({ brandId: product.brandId, pageSize: 12 })
			: Promise.resolve(null)
	]);

	const seenRelated = new Set<string>([product.id]);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const related: any[] = [];
	for (const row of [
		...(byCategory?.data ?? []),
		...(byBrand?.data ?? [])
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	] as any[]) {
		if (seenRelated.has(row.id)) continue;
		seenRelated.add(row.id);
		related.push(row);
		if (related.length >= 8) break;
	}

	return {
		...product,
		images,
		options: options.map((option: { id: string }) => ({
			...option,
			values: values.filter((value: { optionId: string }) => value.optionId === option.id)
		})),
		variants,
		reviews: reviewRows,
		ratingBuckets,
		related
	};
}

export async function listPublicCategories() {
	const rows = await queryDb
		.select({
			id: t.categories.id,
			name: t.categories.name,
			slug: t.categories.slug,
			parentId: t.categories.parentId,
			description: t.categories.description,
			imageUrl: t.categories.imageUrl,
			position: t.categories.position
		})
		.from(t.categories)
		.where(eq(t.categories.status, 'active'))
		.orderBy(asc(t.categories.position), asc(t.categories.name));

	const counts = await queryDb
		.select({ categoryId: t.products.categoryId, value: count() })
		.from(t.products)
		.where(eq(t.products.status, 'active'))
		.groupBy(t.products.categoryId);
	const countMap = new Map<string, number>(
		counts.map((row: { categoryId: string; value: unknown }) => [
			row.categoryId,
			Number(row.value ?? 0)
		])
	);

	return rows.map((row: { id: string }) => ({ ...row, productCount: countMap.get(row.id) ?? 0 }));
}

export async function homeData() {
	const [
		banners,
		announcements,
		testimonials,
		categories,
		brands,
		deals,
		newArrivals,
		featured,
		popular
	] = await Promise.all([
		queryDb
			.select()
			.from(t.banners)
			.where(eq(t.banners.active, true))
			.orderBy(asc(t.banners.position)),
		queryDb
			.select()
			.from(t.announcements)
			.where(eq(t.announcements.active, true))
			.orderBy(asc(t.announcements.position)),
		queryDb
			.select()
			.from(t.testimonials)
			.where(eq(t.testimonials.active, true))
			.orderBy(asc(t.testimonials.position)),
		listPublicCategories(),
		queryDb
			.select({
				id: t.brands.id,
				name: t.brands.name,
				slug: t.brands.slug,
				logoUrl: t.brands.logoUrl
			})
			.from(t.brands)
			.where(eq(t.brands.status, 'active'))
			.orderBy(asc(t.brands.name)),
		listPublicProducts({ deal: true, pageSize: 8 }),
		listPublicProducts({ newArrival: true, pageSize: 8 }),
		listPublicProducts({ featured: true, pageSize: 8 }),
		listPublicProducts({ sort: 'popular', pageSize: 8 })
	]);

	const now = Date.now();
	const inWindow = (row: { startsAt?: string | Date | null; endsAt?: string | Date | null }) =>
		(!row.startsAt || new Date(row.startsAt).getTime() <= now) &&
		(!row.endsAt || new Date(row.endsAt).getTime() >= now);

	return {
		banners: banners.filter(inWindow),
		announcements: announcements.filter(inWindow),
		testimonials,
		categories,
		brands,
		deals: deals.data,
		newArrivals: newArrivals.data,
		featured: featured.data,
		popular: popular.data
	};
}

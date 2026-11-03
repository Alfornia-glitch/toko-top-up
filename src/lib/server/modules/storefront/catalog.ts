import { and, asc, count, desc, eq, inArray, like, or, sum } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export interface PublicProductQuery {
	page?: number;
	pageSize?: number;
	q?: string;
	categoryId?: string;
	brandId?: string;
	featured?: boolean;
	deal?: boolean;
	newArrival?: boolean;
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

	const where = and(...conditions);
	const offset = (page - 1) * pageSize;

	const rows = await queryDb
		.select({
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
			brandName: t.brands.name,
			categoryName: t.categories.name,
			createdAt: t.products.createdAt
		})
		.from(t.products)
		.leftJoin(t.brands, eq(t.products.brandId, t.brands.id))
		.leftJoin(t.categories, eq(t.products.categoryId, t.categories.id))
		.where(where)
		.orderBy(desc(t.products.isFeatured), desc(t.products.createdAt))
		.limit(pageSize)
		.offset(offset);

	const ids = rows.map((row: { id: string }) => row.id);
	const images = ids.length
		? await queryDb
				.select({ productId: t.productImages.productId, url: t.productImages.url })
				.from(t.productImages)
				.where(inArray(t.productImages.productId, ids))
				.orderBy(asc(t.productImages.position))
		: [];
	const stock = ids.length
		? await queryDb
				.select({ productId: t.productVariants.productId, value: sum(t.productVariants.stock) })
				.from(t.productVariants)
				.where(inArray(t.productVariants.productId, ids))
				.groupBy(t.productVariants.productId)
		: [];

	const imageMap = new Map<string, string>();
	const stockMap = new Map<string, number>();
	for (const image of images)
		if (!imageMap.has(image.productId)) imageMap.set(image.productId, image.url);
	for (const row of stock) stockMap.set(row.productId, Number(row.value ?? 0));

	const [{ value: total }] = await queryDb.select({ value: count() }).from(t.products).where(where);

	return {
		data: rows.map((row: (typeof rows)[number]) => ({
			...row,
			imageUrl: imageMap.get(row.id) ?? null,
			stock: stockMap.get(row.id) ?? 0
		})),
		page,
		pageSize,
		total: Number(total ?? 0)
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
			brandName: t.brands.name,
			categoryName: t.categories.name
		})
		.from(t.products)
		.leftJoin(t.brands, eq(t.products.brandId, t.brands.id))
		.leftJoin(t.categories, eq(t.products.categoryId, t.categories.id))
		.where(and(eq(t.products.slug, slug), eq(t.products.status, 'active')))
		.limit(1);

	if (!product) return null;

	const [images, options, variants] = await Promise.all([
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
			.orderBy(asc(t.productVariants.priceCents))
	]);

	const optionIds = options.map((option: { id: string }) => option.id);
	const values = optionIds.length
		? await queryDb
				.select()
				.from(t.productOptionValues)
				.where(inArray(t.productOptionValues.optionId, optionIds))
				.orderBy(asc(t.productOptionValues.position))
		: [];

	return {
		...product,
		images,
		options: options.map((option: { id: string }) => ({
			...option,
			values: values.filter((value: { optionId: string }) => value.optionId === option.id)
		})),
		variants
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
	const [banners, announcements, testimonials, categories, brands, deals, newArrivals, featured] =
		await Promise.all([
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
			listPublicProducts({ featured: true, pageSize: 8 })
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
		featured: featured.data
	};
}

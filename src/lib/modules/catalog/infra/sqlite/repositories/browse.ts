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
	sum,
	type SQL
} from 'drizzle-orm';
import type { SqliteDb } from '#db/core.ts';
import {
	brands,
	categories,
	productImages,
	productOptions,
	productOptionValues,
	products,
	productVariants
} from '../schema.ts';
import type { BrowseRepository, PublicProductFilter } from '../../../modules/browse/server.ts';
import type { PublicProductRow, PublicProductSort } from '../../../modules/browse/index.ts';

const rowSelection = {
	id: products.id,
	sku: products.sku,
	name: products.name,
	slug: products.slug,
	shortDescription: products.shortDescription,
	priceCents: products.priceCents,
	compareAtPriceCents: products.compareAtPriceCents,
	currency: products.currency,
	ratingAvg: products.ratingAvg,
	ratingCount: products.ratingCount,
	soldCount: products.soldCount,
	isFeatured: products.isFeatured,
	isNewArrival: products.isNewArrival,
	isDeal: products.isDeal,
	dealEndsAt: products.dealEndsAt,
	brandName: brands.name,
	categoryName: categories.name,
	createdAt: products.createdAt
};

function whereFor(filter: PublicProductFilter): SQL | undefined {
	const conditions: SQL[] = [eq(products.status, 'active')];

	if (filter.q) {
		const term = `%${filter.q}%`;
		const search = or(like(products.name, term), like(products.sku, term));
		if (search) conditions.push(search);
	}
	if (filter.categoryId) conditions.push(eq(products.categoryId, filter.categoryId));
	if (filter.brandId) conditions.push(eq(products.brandId, filter.brandId));
	if (filter.featured) conditions.push(eq(products.isFeatured, true));
	if (filter.deal) conditions.push(eq(products.isDeal, true));
	if (filter.newArrival) conditions.push(eq(products.isNewArrival, true));
	if (typeof filter.minPrice === 'number')
		conditions.push(gte(products.priceCents, filter.minPrice));
	if (typeof filter.maxPrice === 'number')
		conditions.push(lte(products.priceCents, filter.maxPrice));
	if (typeof filter.minRating === 'number') {
		conditions.push(gte(products.ratingAvg, filter.minRating * 100));
	}
	if (filter.ids) conditions.push(inArray(products.id, filter.ids));

	return and(...conditions);
}

function orderFor(sort: PublicProductSort | undefined): SQL[] {
	switch (sort) {
		case 'popular':
			return [desc(products.soldCount), desc(products.createdAt)];
		case 'price_asc':
			return [asc(products.priceCents), desc(products.createdAt)];
		case 'price_desc':
			return [desc(products.priceCents), desc(products.createdAt)];
		case 'newest':
			return [desc(products.createdAt)];
		case 'recommended':
		default:
			return [desc(products.isFeatured), desc(products.createdAt)];
	}
}

export function createSqliteBrowseRepository(db: SqliteDb): BrowseRepository {
	return {
		async selectProducts(filter, sort, limit, offset = 0) {
			const rows: PublicProductRow[] = await db
				.select(rowSelection)
				.from(products)
				.leftJoin(brands, eq(products.brandId, brands.id))
				.leftJoin(categories, eq(products.categoryId, categories.id))
				.where(whereFor(filter))
				.orderBy(...orderFor(sort))
				.limit(limit)
				.offset(offset);
			return rows;
		},

		async countProducts(filter) {
			const [row] = await db.select({ value: count() }).from(products).where(whereFor(filter));
			return Number(row?.value ?? 0);
		},

		async loadExtras(productIds, includeColors) {
			const imageByProduct = new Map<string, string>();
			const stockByProduct = new Map<string, number>();
			const variantOptionsByProduct = new Map<string, Array<Record<string, string> | null>>();
			if (!productIds.length) return { imageByProduct, stockByProduct, variantOptionsByProduct };

			const [images, stock, variants] = await Promise.all([
				db
					.select({ productId: productImages.productId, url: productImages.url })
					.from(productImages)
					.where(inArray(productImages.productId, productIds))
					.orderBy(asc(productImages.position)),
				db
					.select({ productId: productVariants.productId, value: sum(productVariants.stock) })
					.from(productVariants)
					.where(inArray(productVariants.productId, productIds))
					.groupBy(productVariants.productId),
				includeColors
					? db
							.select({
								productId: productVariants.productId,
								optionValuesJson: productVariants.optionValuesJson
							})
							.from(productVariants)
							.where(
								and(
									inArray(productVariants.productId, productIds),
									eq(productVariants.status, 'active')
								)
							)
					: Promise.resolve([])
			]);

			for (const image of images) {
				if (!imageByProduct.has(image.productId)) imageByProduct.set(image.productId, image.url);
			}
			for (const row of stock) stockByProduct.set(row.productId, Number(row.value ?? 0));
			for (const row of variants) {
				const list = variantOptionsByProduct.get(row.productId) ?? [];
				list.push(row.optionValuesJson);
				variantOptionsByProduct.set(row.productId, list);
			}

			return { imageByProduct, stockByProduct, variantOptionsByProduct };
		},

		async loadFacetSource() {
			const [brandRows, categoryRows, priceRows, discountRows, colorRows] = await Promise.all([
				db
					.select({ id: brands.id, name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl })
					.from(brands)
					.where(eq(brands.status, 'active'))
					.orderBy(asc(brands.name)),
				db
					.select({ id: categories.id, name: categories.name, slug: categories.slug })
					.from(categories)
					.where(eq(categories.status, 'active'))
					.orderBy(asc(categories.position), asc(categories.name)),
				db
					.select({ minCents: min(products.priceCents), maxCents: max(products.priceCents) })
					.from(products)
					.where(eq(products.status, 'active')),
				db
					.select({
						priceCents: products.priceCents,
						compareAtPriceCents: products.compareAtPriceCents
					})
					.from(products)
					.where(and(eq(products.status, 'active'), isNotNull(products.compareAtPriceCents))),
				db
					.select({ optionValuesJson: productVariants.optionValuesJson })
					.from(productVariants)
					.innerJoin(products, eq(productVariants.productId, products.id))
					.where(and(eq(products.status, 'active'), eq(productVariants.status, 'active')))
			]);

			return {
				brands: brandRows,
				categories: categoryRows,
				minCents: Number(priceRows[0]?.minCents ?? 0),
				maxCents: Number(priceRows[0]?.maxCents ?? 0),
				discountRows,
				colorRows: colorRows.map((row) => row.optionValuesJson)
			};
		},

		async findProductBySlug(slug) {
			const [row] = await db
				.select({
					id: products.id,
					sku: products.sku,
					name: products.name,
					slug: products.slug,
					description: products.description,
					shortDescription: products.shortDescription,
					priceCents: products.priceCents,
					compareAtPriceCents: products.compareAtPriceCents,
					currency: products.currency,
					ratingAvg: products.ratingAvg,
					ratingCount: products.ratingCount,
					soldCount: products.soldCount,
					shippingInfo: products.shippingInfo,
					returnPolicy: products.returnPolicy,
					brandId: products.brandId,
					categoryId: products.categoryId,
					brandName: brands.name,
					categoryName: categories.name
				})
				.from(products)
				.leftJoin(brands, eq(products.brandId, brands.id))
				.leftJoin(categories, eq(products.categoryId, categories.id))
				.where(and(eq(products.slug, slug), eq(products.status, 'active')))
				.limit(1);
			return row ?? null;
		},

		async loadProductParts(productId) {
			const [images, options, variants] = await Promise.all([
				db
					.select()
					.from(productImages)
					.where(eq(productImages.productId, productId))
					.orderBy(asc(productImages.position)),
				db
					.select()
					.from(productOptions)
					.where(eq(productOptions.productId, productId))
					.orderBy(asc(productOptions.position)),
				db
					.select()
					.from(productVariants)
					.where(
						and(eq(productVariants.productId, productId), eq(productVariants.status, 'active'))
					)
					.orderBy(asc(productVariants.priceCents))
			]);

			const optionIds = options.map((option) => option.id);
			const values = optionIds.length
				? await db
						.select()
						.from(productOptionValues)
						.where(inArray(productOptionValues.optionId, optionIds))
						.orderBy(asc(productOptionValues.position))
				: [];

			return {
				images,
				options: options.map((option) => ({
					...option,
					values: values.filter((value) => value.optionId === option.id)
				})),
				variants
			};
		},

		async listCategories() {
			return db
				.select({
					id: categories.id,
					name: categories.name,
					slug: categories.slug,
					parentId: categories.parentId,
					description: categories.description,
					imageUrl: categories.imageUrl,
					position: categories.position
				})
				.from(categories)
				.where(eq(categories.status, 'active'))
				.orderBy(asc(categories.position), asc(categories.name));
		},

		async countProductsByCategory() {
			const rows = await db
				.select({ categoryId: products.categoryId, value: count() })
				.from(products)
				.where(eq(products.status, 'active'))
				.groupBy(products.categoryId);
			const counts = new Map<string, number>();
			for (const row of rows) {
				if (row.categoryId) counts.set(row.categoryId, Number(row.value ?? 0));
			}
			return counts;
		},

		async listBrands() {
			return db
				.select({ id: brands.id, name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl })
				.from(brands)
				.where(eq(brands.status, 'active'))
				.orderBy(asc(brands.name));
		},

		async productIsActive(id) {
			const [row] = await db
				.select({ id: products.id })
				.from(products)
				.where(and(eq(products.id, id), eq(products.status, 'active')))
				.limit(1);
			return Boolean(row);
		}
	};
}

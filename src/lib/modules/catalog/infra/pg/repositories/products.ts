import { and, asc, count, desc, eq, inArray, like, ne, or, sum, type SQL } from 'drizzle-orm';
import type { PostgresDb } from '#db/core.ts';
import {
	brands,
	categories,
	productImages,
	productOptions,
	productOptionValues,
	products,
	productVariants
} from '../schema.ts';
import type {
	Product,
	ProductDetail,
	ProductStatus,
	VariantSnapshot
} from '../../../modules/products/index.ts';
import type {
	ProductCreateMeta,
	ProductRepository,
	ProductUpdateMeta
} from '../../../modules/products/server.ts';
import {
	toImageRecords,
	toOptionRecords,
	toProductValues,
	toVariantChanges,
	toVariantRecords
} from '../../../modules/products/server.ts';

const productSelection = {
	id: products.id,
	sku: products.sku,
	name: products.name,
	slug: products.slug,
	description: products.description,
	shortDescription: products.shortDescription,
	brandId: products.brandId,
	categoryId: products.categoryId,
	status: products.status,
	price: products.price,
	compareAtPrice: products.compareAtPrice,
	currency: products.currency,
	isFeatured: products.isFeatured,
	isNewArrival: products.isNewArrival,
	isDeal: products.isDeal,
	dealEndsAt: products.dealEndsAt,
	specsJson: products.specsJson,
	shippingInfo: products.shippingInfo,
	returnPolicy: products.returnPolicy,
	createdAt: products.createdAt,
	updatedAt: products.updatedAt,
	brandName: brands.name,
	categoryName: categories.name
};

export function createPostgresProductRepository(db: PostgresDb): ProductRepository {
	async function findDetail(id: string): Promise<ProductDetail | null> {
		const [row] = await db
			.select(productSelection)
			.from(products)
			.leftJoin(brands, eq(products.brandId, brands.id))
			.leftJoin(categories, eq(products.categoryId, categories.id))
			.where(eq(products.id, id))
			.limit(1);

		if (!row) return null;

		const images = await db
			.select()
			.from(productImages)
			.where(eq(productImages.productId, id))
			.orderBy(asc(productImages.position));

		const options = await db
			.select()
			.from(productOptions)
			.where(eq(productOptions.productId, id))
			.orderBy(asc(productOptions.position));

		const optionIds = options.map((option) => option.id);
		const values = optionIds.length
			? await db
					.select()
					.from(productOptionValues)
					.where(inArray(productOptionValues.optionId, optionIds))
					.orderBy(asc(productOptionValues.position))
			: [];

		const variants = await db
			.select()
			.from(productVariants)
			.where(eq(productVariants.productId, id))
			.orderBy(asc(productVariants.name));

		return {
			...toProduct(row),
			brandName: row.brandName,
			categoryName: row.categoryName,
			images,
			options: options.map((option) => ({
				...option,
				values: values.filter((value) => value.optionId === option.id)
			})),
			variants
		};
	}

	return {
		async list(query) {
			const conditions: SQL[] = [];

			if (query.q) {
				const term = `%${query.q}%`;
				const search = or(
					like(products.name, term),
					like(products.sku, term),
					like(products.slug, term)
				);
				if (search) conditions.push(search);
			}

			if (query.status) conditions.push(eq(products.status, query.status as ProductStatus));
			if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId));
			if (query.brandId) conditions.push(eq(products.brandId, query.brandId));

			const where = conditions.length ? and(...conditions) : undefined;
			const rawSort = query.sort ?? '-updatedAt';
			const direction = rawSort.startsWith('-') ? 'desc' : 'asc';
			const column = productSortColumn(rawSort.replace(/^-/, ''));
			const order = direction === 'desc' ? desc(column) : asc(column);
			const offset = (query.page - 1) * query.pageSize;

			const rows = await db
				.select({
					id: products.id,
					sku: products.sku,
					name: products.name,
					slug: products.slug,
					status: products.status,
					price: products.price,
					compareAtPrice: products.compareAtPrice,
					currency: products.currency,
					isFeatured: products.isFeatured,
					updatedAt: products.updatedAt,
					brandName: brands.name,
					categoryName: categories.name
				})
				.from(products)
				.leftJoin(brands, eq(products.brandId, brands.id))
				.leftJoin(categories, eq(products.categoryId, categories.id))
				.where(where)
				.orderBy(order)
				.limit(query.pageSize)
				.offset(offset);

			const ids = rows.map((row) => row.id);
			const imageByProduct = new Map<string, string>();
			const stockByProduct = new Map<string, number>();

			if (ids.length) {
				const images = await db
					.select({ productId: productImages.productId, url: productImages.url })
					.from(productImages)
					.where(inArray(productImages.productId, ids))
					.orderBy(asc(productImages.position));

				for (const image of images) {
					if (!imageByProduct.has(image.productId)) {
						imageByProduct.set(image.productId, image.url);
					}
				}

				const stockRows = await db
					.select({ productId: productVariants.productId, value: sum(productVariants.stock) })
					.from(productVariants)
					.where(inArray(productVariants.productId, ids))
					.groupBy(productVariants.productId);

				for (const row of stockRows) {
					stockByProduct.set(row.productId, Number(row.value ?? 0));
				}
			}

			const [totalRow] = await db.select({ value: count() }).from(products).where(where);

			return {
				data: rows.map((row) => ({
					...row,
					imageUrl: imageByProduct.get(row.id) ?? null,
					stock: stockByProduct.get(row.id) ?? 0
				})),
				total: Number(totalRow?.value ?? 0)
			};
		},

		findDetail,

		async findById(id) {
			const [row] = await db
				.select({ id: products.id })
				.from(products)
				.where(eq(products.id, id))
				.limit(1);
			return row ?? null;
		},

		async findBySlug(slug, excludeId) {
			const where = excludeId
				? and(eq(products.slug, slug), ne(products.id, excludeId))
				: eq(products.slug, slug);
			const [row] = await db.select({ id: products.id }).from(products).where(where).limit(1);
			return row ?? null;
		},

		async findBySku(sku, excludeId) {
			const where = excludeId
				? and(eq(products.sku, sku), ne(products.id, excludeId))
				: eq(products.sku, sku);
			const [row] = await db.select({ id: products.id }).from(products).where(where).limit(1);
			return row ?? null;
		},

		async create(input, meta: ProductCreateMeta) {
			await db.transaction(async (tx) => {
				await tx.insert(products).values({
					id: meta.id,
					...toProductValues(input, meta.slug),
					createdBy: meta.createdBy,
					createdAt: meta.now,
					updatedAt: meta.now
				});

				const images = toImageRecords(input.images, meta.id, meta.now);
				if (images.length) await tx.insert(productImages).values(images);

				for (const record of toOptionRecords(input.options, meta.id, meta.now)) {
					await tx.insert(productOptions).values(record.option);
					if (record.values.length) {
						await tx.insert(productOptionValues).values(record.values);
					}
				}

				const variants = toVariantRecords(input.variants, meta.id, meta.now);
				if (variants.length) await tx.insert(productVariants).values(variants);
			});
		},

		async update(id, input, meta: ProductUpdateMeta) {
			await db.transaction(async (tx) => {
				const existingVariants = await tx
					.select({ id: productVariants.id })
					.from(productVariants)
					.where(eq(productVariants.productId, id));
				const existingVariantIds = new Set(existingVariants.map((variant) => variant.id));

				const existingOptions = await tx
					.select({ id: productOptions.id })
					.from(productOptions)
					.where(eq(productOptions.productId, id));
				const existingOptionIds = existingOptions.map((option) => option.id);

				await tx
					.update(products)
					.set({ ...toProductValues(input, meta.slug), updatedAt: meta.now })
					.where(eq(products.id, id));

				await tx.delete(productImages).where(eq(productImages.productId, id));

				if (existingOptionIds.length) {
					await tx
						.delete(productOptionValues)
						.where(inArray(productOptionValues.optionId, existingOptionIds));
				}

				await tx.delete(productOptions).where(eq(productOptions.productId, id));

				const images = toImageRecords(input.images, id, meta.now);
				if (images.length) await tx.insert(productImages).values(images);

				for (const record of toOptionRecords(input.options, id, meta.now)) {
					await tx.insert(productOptions).values(record.option);
					if (record.values.length) {
						await tx.insert(productOptionValues).values(record.values);
					}
				}

				const changes = toVariantChanges(input.variants, id, existingVariantIds, meta.now);

				for (const change of changes.updates) {
					await tx
						.update(productVariants)
						.set(change.values)
						.where(eq(productVariants.id, change.id));
				}

				if (changes.inserts.length) {
					await tx.insert(productVariants).values(changes.inserts);
				}

				if (changes.removedIds.length) {
					await tx
						.update(productVariants)
						.set({ status: 'inactive', stock: 0, updatedAt: meta.now })
						.where(inArray(productVariants.id, changes.removedIds));
				}
			});

			return findDetail(id);
		},

		async setStatus(id, status, updatedAt) {
			const [row] = await db
				.update(products)
				.set({ status, updatedAt })
				.where(eq(products.id, id))
				.returning({ id: products.id });

			if (!row) return null;
			return findDetail(id);
		},

		async findVariantSnapshots(variantIds): Promise<VariantSnapshot[]> {
			if (!variantIds.length) return [];

			const rows = await db
				.select({
					variantId: productVariants.id,
					sku: productVariants.sku,
					name: productVariants.name,
					status: productVariants.status,
					price: productVariants.price,
					compareAtPrice: productVariants.compareAtPrice,
					stock: productVariants.stock,
					productId: products.id,
					productSlug: products.slug,
					productName: products.name,
					productCurrency: products.currency,
					brandName: brands.name
				})
				.from(productVariants)
				.innerJoin(products, eq(productVariants.productId, products.id))
				.leftJoin(brands, eq(products.brandId, brands.id))
				.where(inArray(productVariants.id, variantIds));

			const productIds = [...new Set(rows.map((row) => row.productId))];
			const imageByProduct = new Map<string, string>();
			if (productIds.length) {
				const images = await db
					.select({ productId: productImages.productId, url: productImages.url })
					.from(productImages)
					.where(inArray(productImages.productId, productIds))
					.orderBy(asc(productImages.position), asc(productImages.id));
				for (const image of images) {
					if (!imageByProduct.has(image.productId)) imageByProduct.set(image.productId, image.url);
				}
			}

			return rows.map((row) => ({
				...row,
				brandName: row.brandName ?? null,
				imageUrl: imageByProduct.get(row.productId) ?? null
			}));
		},

		async findNames(productIds) {
			if (!productIds.length) return new Map();
			const rows = await db
				.select({ id: products.id, name: products.name })
				.from(products)
				.where(inArray(products.id, productIds));
			return new Map(rows.map((row) => [row.id, row.name]));
		},

		async listIdsByStatus(status) {
			const rows = await db
				.select({ id: products.id })
				.from(products)
				.where(eq(products.status, status));
			return rows.map((row) => row.id);
		},

		async deleteArchived(productIds) {
			const deleted = await db
				.delete(products)
				.where(and(inArray(products.id, productIds), eq(products.status, 'archived')))
				.returning({ id: products.id });
			return deleted.length;
		}
	};
}

function productSortColumn(key: string) {
	switch (key) {
		case 'name':
			return products.name;
		case 'sku':
			return products.sku;
		case 'price':
		case 'price':
			return products.price;
		case 'createdAt':
			return products.createdAt;
		case 'updatedAt':
		default:
			return products.updatedAt;
	}
}

function toProduct(row: Product): Product {
	return {
		id: row.id,
		sku: row.sku,
		name: row.name,
		slug: row.slug,
		description: row.description,
		shortDescription: row.shortDescription,
		brandId: row.brandId,
		categoryId: row.categoryId,
		status: row.status,
		price: row.price,
		compareAtPrice: row.compareAtPrice,
		currency: row.currency,
		isFeatured: row.isFeatured,
		isNewArrival: row.isNewArrival,
		isDeal: row.isDeal,
		dealEndsAt: row.dealEndsAt,
		specsJson: row.specsJson,
		shippingInfo: row.shippingInfo,
		returnPolicy: row.returnPolicy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}
